
const authService = require('../service/auth.service');

const {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} = authService;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

function loginCookieOptions() {
  return {
    ...cookieOptions(),
    maxAge: SESSION_DURATION_MS,
  };
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body || {};

  const result = await authService.login({
    email,
    password,
  });

  res.cookie(
    SESSION_COOKIE_NAME,
    result.sessionToken,
    loginCookieOptions()
  );

  res.set('Cache-Control', 'no-store');

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    user: result.user,
    session: result.session,
  });
}

// POST /api/auth/logout
async function logout(req, res) {
  const sessionToken =
    req.cookies?.[SESSION_COOKIE_NAME];

  await authService.logout(sessionToken);

  res.clearCookie(
    SESSION_COOKIE_NAME,
    cookieOptions()
  );

  res.set('Cache-Control', 'no-store');

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}

// GET /api/auth/me
async function me(req, res) {
  const sessionToken =
    req.cookies?.[SESSION_COOKIE_NAME];

  const result = await authService.getCurrentUser(
    sessionToken
  );

  res.set('Cache-Control', 'no-store');

  return res.status(200).json({
    success: true,
    user: result.user,
    memberships: result.memberships,
    session: result.session,
  });
}

// POST /api/auth/logout-all
async function logoutAll(req, res) {
  await authService.logoutAll(req.user.id);

  res.clearCookie(
    SESSION_COOKIE_NAME,
    cookieOptions()
  );

  res.set('Cache-Control', 'no-store');

  return res.status(200).json({
    success: true,
    message: 'All sessions revoked',
  });
}


/**
 * POST /api/auth/register
 *
 * Public customer registration.
 * Always creates a normal SaaS USER.
 */
async function register(req, res) {
  const { name, email, password } = req.body || {};

  const result = await authService.registerCustomer({
    name,
    email,
    password,
  });

  res.set('Cache-Control', 'no-store');

  return res.status(201).json({
    success: true,
    message: 'Account created. Email verification is required.',
    user: result.user,
    emailVerificationRequired: true,
  });
}


module.exports = {
  register,
  login,
  logout,
  me,
  logoutAll,
};
