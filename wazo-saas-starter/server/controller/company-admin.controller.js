
const service = require('../service/company-admin.service');

async function list(req, res) {
  const companies = await service.listCompanies(
    req.query.status
  );

  return res.json({
    success: true,
    companies,
  });
}

async function approve(req, res) {
  const company = await service.approveCompany(
    req.params.id,
    req.user.id
  );

  return res.json({
    success: true,
    message: 'Company approved and Wazo provisioned',
    company,
  });
}

async function reject(req, res) {
  const company = await service.rejectCompany(
    req.params.id,
    req.user.id,
    req.body?.reason
  );

  return res.json({
    success: true,
    message: 'Company application rejected',
    company,
  });
}

module.exports = {
  list,
  approve,
  reject,
};
