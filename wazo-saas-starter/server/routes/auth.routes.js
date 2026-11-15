
const express = require('express');
const { rateLimit } = require('express-rate-limit');

const authController = require('../controller/auth.controller');

const {
  authenticate,
} = require('../middleware/authenticate');

const   {validateRequestOrigin }  = require('../middleware/validate-request-origin');

const router = express.Router();

// Convert async errors into Express error middleware calls.
// Works with Express 4 and Express 5.
const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
    code: 'LOGIN_RATE_LIMITED',
  },
});


const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again later.',
    code: 'REGISTRATION_RATE_LIMITED',
  },
});


// Public login, protected against excessive attempts.
router.post(
  '/auth/login',
  validateRequestOrigin,
  loginLimiter,
  asyncHandler(authController.login)
);

// Authenticated user information.
router.get(
  '/auth/me',
  authenticate,
  asyncHandler(authController.me)
);

// Revoke current session.
router.post(
  '/auth/logout',
  validateRequestOrigin,
  authenticate,
  asyncHandler(authController.logout)
);

// Revoke every session belonging to this user.
router.post(
  '/auth/logout-all',
  validateRequestOrigin,
  authenticate,
  asyncHandler(authController.logoutAll)
);


router.post(
  '/auth/register',
  validateRequestOrigin,
  registrationLimiter,
  asyncHandler(authController.register)
);


module.exports = router;
