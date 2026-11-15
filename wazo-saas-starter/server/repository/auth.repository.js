
const prisma = require('../config/prisma');

/**
 * SaaS authentication repository.
 *
 * Database access only:
 * - Users
 * - Sessions
 * - Organizations
 * - Memberships
 * - Invitations
 *
 * Password hashing, token generation, authorization,
 * and HTTP cookie handling belong in other layers.
 */

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  platformRole: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const membershipInclude = {
  organization: {
    select: {
      id: true,
      name: true,
      wazoTenantUuid: true,
    },
  },
};

// ==========================================
// USERS
// ==========================================

async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });
}

async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: {
      email: email.trim().toLowerCase(),
    },
  });
}

async function findUserByIdWithMemberships(id) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      ...safeUserSelect,
      memberships: {
        include: membershipInclude,
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });
}

async function createUser({
  email,
  name,
  passwordHash,
  platformRole = 'USER',
  isActive = true,
}) {
  return prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      passwordHash,
      platformRole,
      isActive,
    },
    select: safeUserSelect,
  });
}

async function updateUser(id, data) {
  const allowed = {};

  if (data.name !== undefined) {
    allowed.name = data.name.trim();
  }

  if (data.email !== undefined) {
    allowed.email = data.email.trim().toLowerCase();
  }

  if (data.passwordHash !== undefined) {
    allowed.passwordHash = data.passwordHash;
  }

  if (data.isActive !== undefined) {
    allowed.isActive = data.isActive;
  }

  return prisma.user.update({
    where: { id },
    data: allowed,
    select: safeUserSelect,
  });
}

// ==========================================
// SESSIONS
// ==========================================

async function createSession({
  userId,
  tokenHash,
  expiresAt,
}) {
  return prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
}

/**
 * Find an active session and its user.
 *
 * The service hashes the cookie token before calling
 * this method. Raw session tokens are never stored.
 */
async function findActiveSessionByTokenHash(tokenHash) {
  return prisma.session.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
      user: {
        isActive: true,
      },
    },
    include: {
      user: {
        select: safeUserSelect,
      },
    },
  });
}

async function revokeSessionByTokenHash(tokenHash) {
  return prisma.session.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

async function revokeAllUserSessions(userId) {
  return prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

async function deleteExpiredSessions() {
  return prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}

// ==========================================
// ORGANIZATIONS
// ==========================================

async function findOrganizationById(id) {
  return prisma.organization.findUnique({
    where: { id },
  });
}

async function findOrganizationByWazoTenantUuid(wazoTenantUuid) {
  return prisma.organization.findUnique({
    where: { wazoTenantUuid },
  });
}

async function createOrganization({
  name,
  wazoTenantUuid,
}) {
  return prisma.organization.create({
    data: {
      name: name.trim(),
      wazoTenantUuid,
    },
  });
}

async function findOrganizationsForUser(userId) {
  return prisma.membership.findMany({
    where: {
      userId,
    },
    include: membershipInclude,
    orderBy: {
      createdAt: 'asc',
    },
  });
}

// ==========================================
// MEMBERSHIPS
// ==========================================

async function findMembership(userId, organizationId) {
  return prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    include: membershipInclude,
  });
}

async function findMembershipByWazoTenantUuid(
  userId,
  wazoTenantUuid
) {
  return prisma.membership.findFirst({
    where: {
      userId,
      organization: {
        wazoTenantUuid,
      },
    },
    include: membershipInclude,
  });
}

async function createMembership({
  userId,
  organizationId,
  role = 'AGENT',
}) {
  return prisma.membership.create({
    data: {
      userId,
      organizationId,
      role,
    },
    include: membershipInclude,
  });
}

async function updateMembershipRole({
  userId,
  organizationId,
  role,
}) {
  return prisma.membership.update({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    data: {
      role,
    },
    include: membershipInclude,
  });
}

async function removeMembership(userId, organizationId) {
  return prisma.membership.deleteMany({
    where: {
      userId,
      organizationId,
    },
  });
}

async function listOrganizationMembers(organizationId) {
  return prisma.membership.findMany({
    where: {
      organizationId,
    },
    include: {
      user: {
        select: safeUserSelect,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

// ==========================================
// INVITATIONS
// ==========================================

async function createInvitation({
  email,
  tokenHash,
  organizationId,
  invitedById,
  role,
  expiresAt,
}) {
  return prisma.invitation.create({
    data: {
      email: email.trim().toLowerCase(),
      tokenHash,
      organizationId,
      invitedById,
      role,
      expiresAt,
    },
  });
}

async function findValidInvitationByTokenHash(tokenHash) {
  return prisma.invitation.findFirst({
    where: {
      tokenHash,
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          wazoTenantUuid: true,
        },
      },
    },
  });
}

async function markInvitationAccepted(id) {
  return prisma.invitation.updateMany({
    where: {
      id,
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    data: {
      acceptedAt: new Date(),
    },
  });
}

async function listOrganizationInvitations(organizationId) {
  return prisma.invitation.findMany({
    where: {
      organizationId,
    },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  // Users
  findUserById,
  findUserByEmail,
  findUserByIdWithMemberships,
  createUser,
  updateUser,

  // Sessions
  createSession,
  findActiveSessionByTokenHash,
  revokeSessionByTokenHash,
  revokeAllUserSessions,
  deleteExpiredSessions,

  // Organizations
  findOrganizationById,
  findOrganizationByWazoTenantUuid,
  createOrganization,
  findOrganizationsForUser,

  // Memberships
  findMembership,
  findMembershipByWazoTenantUuid,
  createMembership,
  updateMembershipRole,
  removeMembership,
  listOrganizationMembers,

  // Invitations
  createInvitation,
  findValidInvitationByTokenHash,
  markInvitationAccepted,
  listOrganizationInvitations,
};
