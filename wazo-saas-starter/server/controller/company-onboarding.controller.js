
const service = require('../service/company-onboarding.service');
const HttpError = require('../utils/httpError');

function getAuthenticatedUserId(req) {
  // Adjust this to the actual property assigned by
  // your server/middleware/authenticate.js.
  const userId = req.user?.id || req.auth?.user?.id;

  if (!userId) {
    throw new HttpError(401, 'Authentication required');
  }

  return userId;
}

async function create(req, res) {
  const organization = await service.applyForCompany(
    getAuthenticatedUserId(req),
    req.body
  );

  res.status(201).json({
    success: true,
    message: 'Company application submitted for approval',
    organization,
  });
}

async function listMine(req, res) {
  const organizations = await service.getMyCompanies(
    getAuthenticatedUserId(req)
  );

  res.json({
    success: true,
    organizations,
  });
}

module.exports = {
  create,
  listMine,
};
