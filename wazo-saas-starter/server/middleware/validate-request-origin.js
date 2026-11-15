
function validateRequestOrigin(req, res, next) {
  const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    return res.status(503).json({
      success: false,
      error: 'Allowed frontend origin is not configured',
      code: 'ORIGIN_NOT_CONFIGURED',
    });
  }

  const origin = req.get('origin');

  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      success: false,
      error: 'Request origin is not allowed',
      code: 'INVALID_ORIGIN',
    });
  }

  return next();
}

module.exports = {validateRequestOrigin};
