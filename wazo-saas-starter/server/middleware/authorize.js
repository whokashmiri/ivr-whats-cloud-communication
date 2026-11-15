
/**
 * Platform-level role authorization middleware.
 *
 * Requires authenticate middleware to run first.
 *
 * Prisma PlatformRole values:
 *   USER
 *   PLATFORM_ADMIN
 *
 * Organization-specific roles are enforced separately
 * by tenant-access.js.
 */

const PLATFORM_ROLES = Object.freeze({
  USER: 'USER',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
});

const VALID_PLATFORM_ROLES = new Set(
  Object.values(PLATFORM_ROLES)
);

/**
 * Returns a consistent authorization error response.
 */
function sendForbidden(res, code = 'FORBIDDEN') {
  return res.status(403).json({
    success: false,
    error: 'You do not have permission to perform this action',
    code,
  });
}

/**
 * Authorize one or more platform roles.
 *
 * Example:
 *   router.get(
 *     '/admin',
 *     authenticate,
 *     authorize('PLATFORM_ADMIN'),
 *     controller
 *   );
 *
 * Passing multiple roles means any listed role is sufficient.
 */
function authorize(...allowedRoles) {
  if (
    allowedRoles.length === 0 ||
    allowedRoles.some((role) => !VALID_PLATFORM_ROLES.has(role))
  ) {
    throw new Error(
      'authorize() requires at least one valid platform role'
    );
  }

  return function authorizeMiddleware(req, res, next) {
    const user = req.user;

    // authenticate must always run before authorize.
    if (!user || !req.auth || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHENTICATED',
      });
    }

    if (!allowedRoles.includes(user.platformRole)) {
      return sendForbidden(res, 'INSUFFICIENT_PLATFORM_ROLE');
    }

    return next();
  };
}

/**
 * Require a platform administrator.
 */
const requirePlatformAdmin = authorize(
  PLATFORM_ROLES.PLATFORM_ADMIN
);

module.exports = {
  PLATFORM_ROLES,
  authorize,
  requirePlatformAdmin,
};
