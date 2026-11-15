const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const ffmpeg = require('ffmpeg-static');
const prisma = require('../config/prisma');
const { validateTenant } = require('../models/employee.model');
const HttpError = require('../utils/httpError');

const execFileAsync = promisify(execFile);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_DURATION_SECONDS = 120;
const WAZO_SOUND_ROOT = '/var/lib/wazo/sounds';
const ALLOWED_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.oga', '.flac', '.opus', '.wma', '.webm']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function dockerOptions() {
  const cwd = process.env.WAZO_DOCKER_COMPOSE_DIR;
  if (!cwd || !path.isAbsolute(cwd)) throw new HttpError(503, 'WAZO_DOCKER_COMPOSE_DIR is not configured');
  return {
    cwd, timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true,
    env: { ...process.env, LOCAL_GIT_REPOS: process.env.LOCAL_GIT_REPOS || path.dirname(cwd) },
  };
}
function runDocker(args) {
  return execFileAsync(process.platform === 'win32' ? 'docker.exe' : 'docker', args, dockerOptions());
}
function validateName(raw) {
  if (typeof raw !== 'string' || raw.trim().length < 2 || raw.trim().length > 80) {
    throw new HttpError(400, 'Greeting name must contain 2-80 characters');
  }
  return raw.trim().replace(/\s+/g, ' ');
}
async function convertToWav(source, output) {
  if (!ffmpeg) throw new HttpError(503, 'FFmpeg executable is unavailable');
  await execFileAsync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', source,
    '-map', '0:a:0', '-vn', '-t', String(MAX_DURATION_SECONDS),
    '-ac', '1', '-ar', '8000', '-c:a', 'pcm_s16le', '-f', 'wav', output,
  ], { timeout: 45000, maxBuffer: 256 * 1024, windowsHide: true });
  const stat = await fs.stat(output);
  if (stat.size <= 44 || stat.size > 2100000) throw new HttpError(400, 'Invalid or oversized converted WAV');
}
function remotePaths(tenant, audioId) {
  const directory = `${WAZO_SOUND_ROOT}/tenants/${tenant}/playback`;
  const stem = `ivr-${audioId}`;
  return { directory, file: `${directory}/${stem}.wav`, menuSound: `${directory}/${stem}` };
}
async function uploadIvrAudio(tenant, file, rawName) {
  validateTenant(tenant);
  const name = validateName(rawName);
  if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length || file.buffer.length > MAX_UPLOAD_BYTES) {
    throw new HttpError(400, 'An audio file between 1 byte and 10 MB is required');
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new HttpError(400, 'Unsupported audio file extension');
  const audioId = crypto.randomUUID();
  const remote = remotePaths(tenant, audioId);
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'wazo-ivr-'));
  const source = path.join(temp, `source${ext}`);
  const wavPath = path.join(temp, `ivr-${audioId}.wav`);
  try {
    await fs.writeFile(source, file.buffer);
    await convertToWav(source, wavPath);
    await runDocker(['compose', 'exec', '-T', 'confd', 'mkdir', '-p', remote.directory]);
    await runDocker(['compose', 'cp', wavPath, `confd:${remote.file}`]);
    await runDocker(['compose', 'exec', '-T', 'confd', 'test', '-s', remote.file]);
    // Database stores only metadata. The audio remains in Wazo's persistent sounds volume.
    const record = await prisma.ivrAudio.create({
      data: { id: audioId, tenantUuid: tenant, name, originalName: file.originalname, menuSound: remote.menuSound },
      select: { id: true, tenantUuid: true, name: true, originalName: true, menuSound: true, createdAt: true },
    });
    return { success: true, audio: record };
  } catch (error) {
    console.error('[IVR audio upload]', { tenant, audioId, errorCode: error.code || null });
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, 'Audio storage failed; inspect Wazo for an orphan file before retrying');
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}
async function listIvrAudio(tenant) {
  validateTenant(tenant);
  return prisma.ivrAudio.findMany({
    where: { tenantUuid: tenant },
    select: { id: true, tenantUuid: true, name: true, originalName: true, menuSound: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}
async function getIvrAudioFile(tenant, audioId) {
  validateTenant(tenant);
  if (!UUID.test(audioId || '')) throw new HttpError(400, 'Invalid audio ID');
  const record = await prisma.ivrAudio.findFirst({ where: { id: audioId, tenantUuid: tenant }, select: { id: true } });
  if (!record) throw new HttpError(404, 'Greeting not found');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'wazo-ivr-preview-'));
  const local = path.join(temp, 'preview.wav');
  try {
    await runDocker(['compose', 'cp', `confd:${remotePaths(tenant, audioId).file}`, local]);
    const stat = await fs.stat(local);
    if (stat.size < 45 || stat.size > 2100000) throw new Error('Unexpected WAV file size');
    return await fs.readFile(local);
  } catch (error) {
    console.error('[IVR audio preview]', { tenant, audioId, errorCode: error.code || null });
    throw new HttpError(502, 'Could not load greeting from Wazo');
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}
module.exports = { uploadIvrAudio, listIvrAudio, getIvrAudioFile };
