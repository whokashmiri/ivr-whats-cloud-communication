
const authRepository = require('../repository/auth.repository');

const {
  isPlatformAdmin,
} = require('../service/auth.service');

// ==========================================
// ORGANIZATION ROLES
// ==========================================

const ORGANIZATION_ROLES = Object.freeze({
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  AGENT: 'AGENT',
});

const VALID_ORGANIZATION_ROLES = new Set(
  Object.values(ORGANIZATION_ROLES)
);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ==========================================
// RESPONSE HELPERS
// ==========================================

function sendUnauthorized(res) {
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    code: 'UNAUTHENTICATED',
  });
}

function sendForbidden(res, code = 'TENANT_ACCESS_DENIED') {
  return res.status(403).json({
    success: false,
    error: 'You do not have permission to access this company',
    code,
  });
}

function sendInvalidTenant(res) {
  return res.status(400).json({
    success: false,
    error: 'A valid company tenant UUID is required',
    code: 'INVALID_TENANT_UUID',
  });
}

function sendOrganizationNotFound(res) {
  return res.status(404).json({
    success: false,
    error: 'Company not found',
    code: 'ORGANIZATION_NOT_FOUND',
  });
}

function requireTenantAccess(...allowedRoles) {
  if (
    allowedRoles.length === 0 ||
    allowedRoles.some(
      (role) => !VALID_ORGANIZATION_ROLES.has(role)
    )
  ) {
    throw new Error(
      'requireTenantAccess() requires at least one valid organization role'
    );
  }

  return async function tenantAccessMiddleware(req, res, next) {
    try {
      // ------------------------------------------
      // 1. Verify authenticated SaaS user
      // ------------------------------------------

      const user = req.user;

      if (!user || !req.auth || !user.isActive) {
        return sendUnauthorized(res);
      }

      // ------------------------------------------
      // 2. Validate Wazo tenant UUID
      // ------------------------------------------

      const tenantUuid = req.params?.uuid;

      if (
        typeof tenantUuid !== 'string' ||
        !UUID_REGEX.test(tenantUuid)
      ) {
        return sendInvalidTenant(res);
      }

      const normalizedTenantUuid = tenantUuid.toLowerCase();

      // ------------------------------------------
      // 3. Resolve SaaS organization
      // ------------------------------------------

      const organization =
        await authRepository.findOrganizationByWazoTenantUuid(
          normalizedTenantUuid
        );

      if (!organization) {
        return sendOrganizationNotFound(res);
      }

      // ------------------------------------------
      // 4. Check organization activation
      // ------------------------------------------

      if (organization.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          error: 'This company is not active',
          code: 'ORGANIZATION_NOT_ACTIVE',
          organizationStatus: organization.status,
        });
      }

      // ------------------------------------------
      // 5. Platform administrator bypass
      // ------------------------------------------

      if (isPlatformAdmin(user)) {
        req.tenantAccess = {
          tenantUuid: normalizedTenantUuid,
          organizationId: organization.id,
          organization,
          role: 'PLATFORM_ADMIN',
          platformAdmin: true,
        };

        return next();
      }

      // ------------------------------------------
      // 6. Verify company membership
      // ------------------------------------------

      const membership =
        await authRepository.findMembership(
          user.id,
          organization.id
        );

      if (!membership) {
        return sendForbidden(res);
      }

      // ------------------------------------------
      // 7. Verify organization role
      // ------------------------------------------

      if (!allowedRoles.includes(membership.role)) {
        return sendForbidden(
          res,
          'INSUFFICIENT_ORGANIZATION_ROLE'
        );
      }

      // ------------------------------------------
      // 8. Attach authorized tenant context
      // ------------------------------------------

      req.tenantAccess = {
        tenantUuid: normalizedTenantUuid,
        organizationId: organization.id,
        organization,
        role: membership.role,
        membershipId: membership.id,
        platformAdmin: false,
      };

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  ORGANIZATION_ROLES,
  requireTenantAccess,
};
