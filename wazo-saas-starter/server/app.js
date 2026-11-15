//server/app.js

const express = require('express');
const cookieParser = require('cookie-parser');

const healthRoutes = require('./routes/health.routes');
const errorMiddleware = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const companyOnboardingRoutes = require('./routes/company-onboarding.routes');
const companyAdminRoutes = require('./routes/company-admin.routes');
const tenantRoutes = require('./routes/tenant.routes');
const employeeRoutes = require('./routes/employee.routes');
const departmentRoutes = require('./routes/department.routes');
const ivrRoutes = require('./routes/ivr.routes');
const ivrAudioRoutes = require('./routes/ivr-audio.routes');
const ivrRouteRoutes = require('./routes/ivr-route.routes');
const incomingSetupRoutes = require('./routes/incoming-setup.routes');
const phoneNumberRoutes = require('./routes/phone-number.routes');
const sipTrunkRoutes = require('./routes/sip-trunk.routes');

// NEW: direct Meta WhatsApp Cloud API integration
const { mountWhatsAppWebhook, mountWhatsAppAdmin } = require('./routes/whatsapp.routes');
const authenticateModule = require('./middleware/authenticate');
const authenticate = typeof authenticateModule === 'function'
  ? authenticateModule
  : authenticateModule.authenticate;

const app = express();
app.disable('x-powered-by');

// IMPORTANT: verify Meta webhook signature using raw body before express.json().
mountWhatsAppWebhook(app);

app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
// Cookie-based administrative routes must be mounted AFTER cookieParser().
mountWhatsAppAdmin(app, authenticate);
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api/account', companyOnboardingRoutes);
app.use('/api/admin', companyAdminRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api', employeeRoutes);
app.use('/api', departmentRoutes);
app.use('/api', ivrRoutes);
app.use('/api', ivrAudioRoutes);
app.use('/api', ivrRouteRoutes);
app.use('/api', incomingSetupRoutes);
app.use('/api', phoneNumberRoutes);
app.use('/api', sipTrunkRoutes);
app.use(errorMiddleware);
module.exports = app;
