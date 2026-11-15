
require('dotenv').config();
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const NAME_RE = /^[A-Za-z0-9_-]{1,80}$/;
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function composeDir() {
  const dir = process.env.WAZO_DOCKER_COMPOSE_DIR;

  if (!dir || !path.isAbsolute(dir)) {
    throw new Error('Invalid WAZO_DOCKER_COMPOSE_DIR');
  }

  return dir;
}

async function compose(args, timeout = 60000) {
  const dir = composeDir();

  const result = await execFileAsync(
    process.platform === 'win32'
      ? 'docker.exe'
      : 'docker',
    ['compose', ...args],
    {
      cwd: dir,
      timeout,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      env: {
        ...process.env,
        LOCAL_GIT_REPOS:
          process.env.LOCAL_GIT_REPOS ||
          path.dirname(dir),
      },
    }
  );

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

async function asterisk(command) {
  return compose([
    'exec',
    '-T',
    'asterisk',
    'asterisk',
    '-rx',
    command,
  ]);
}

async function getPeerIp() {
  const { stdout } = await compose([
    'exec',
    '-T',
    'sip-test',
    'hostname',
    '-i',
  ]);

  const addresses = stdout.trim().split(/\s+/);

  const ip = addresses.find(
    value =>
      IPV4_RE.test(value) &&
      value.split('.').every(
        part => Number(part) >= 0 && Number(part) <= 255
      )
  );

  if (!ip) {
    throw new Error(
      'Could not determine the SIP test peer IPv4 address'
    );
  }

  return ip;
}

async function reloadPjsip() {
  // Reuses the same local Wazo configuration generation
  // workflow already verified during employee provisioning.
  return compose([
    'exec',
    '-T',
    'asterisk',
    'bash',
    '-lc',
    'wazo-confgen asterisk/pjsip.conf --invalidate && asterisk -rx "core reload"',
  ]);
}

async function inspectEndpoint(name) {
  if (!NAME_RE.test(name)) {
    throw new Error('Invalid SIP endpoint name');
  }

  return asterisk(`pjsip show endpoint ${name}`);
}

async function inspectIdentify() {
  return asterisk('pjsip show identifies');
}

let queue = Promise.resolve();

function serialized(fn) {
  const task = queue.catch(() => {}).then(fn);

  queue = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}

async function activate({ endpointName, peerIp, context }) {
  if (
    !NAME_RE.test(endpointName) ||
    !NAME_RE.test(context) ||
    !IPV4_RE.test(peerIp)
  ) {
    throw new Error('Invalid trunk activation parameters');
  }

  return serialized(async () => {
    const currentIp = await getPeerIp();

    if (currentIp !== peerIp) {
      throw new Error(
        `SIP peer IP changed: expected ${peerIp}, found ${currentIp}`
      );
    }

    await reloadPjsip();

    const endpoint = await inspectEndpoint(endpointName);
    const output = endpoint.stdout + endpoint.stderr;

    const endpointFound = new RegExp(
      `Endpoint:\\s+${endpointName}(?:/|\\s)`
    ).test(output);

    const contextFound = new RegExp(
      `^\\s*context\\s*:\\s*${context}\\s*$`,
      'im'
    ).test(output);

    const identifies = await inspectIdentify();
    const identifyOutput =
      identifies.stdout + identifies.stderr;

    const identifyFound =
      identifyOutput.includes(endpointName) &&
      identifyOutput.includes(peerIp);

    if (!endpointFound || !contextFound || !identifyFound) {
      throw new Error(
        'Asterisk trunk endpoint, context, or identify verification failed'
      );
    }

    return {
      applied: true,
      verified: true,
      endpointName,
      context,
      peerIp,
      checkedAt: new Date().toISOString(),
    };
  });
}

module.exports = {
  getPeerIp,
  activate,
};
