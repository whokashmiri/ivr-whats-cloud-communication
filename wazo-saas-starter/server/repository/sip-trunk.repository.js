
const { request } = require('../integrations/wazo/wazo.client');

const BASE = '/api/confd/1.1';

function api(token, tenant, endpoint, method = 'GET', body) {
  return request(`${BASE}${endpoint}`, {
    token,
    tenant,
    method,
    ...(body === undefined ? {} : { body }),
  });
}

module.exports = {
  listTrunks(token, tenant) {
    return api(token, tenant, '/trunks?limit=10000');
  },

  getTrunk(token, tenant, id) {
    return api(token, tenant, `/trunks/${id}`);
  },

  createTrunk(token, tenant, body) {
    return api(token, tenant, '/trunks', 'POST', body);
  },

  listSipEndpoints(token, tenant) {
    return api(
      token, tenant, '/endpoints/sip?limit=10000'
    );
  },

  getSipEndpoint(token, tenant, uuid) {
    return api(
      token, tenant, `/endpoints/sip/${uuid}`
    );
  },

  createSipEndpoint(token, tenant, body) {
    return api(
      token, tenant, '/endpoints/sip', 'POST', body
    );
  },

  associateSipEndpoint(token, tenant, trunkId, sipUuid) {
    return api(
      token,
      tenant,
      `/trunks/${trunkId}/endpoints/sip/${sipUuid}`,
      'PUT',
      {}
    );
  },

  listContexts(token, tenant) {
    return api(token, tenant, '/contexts?limit=10000');
  },

  getTenant(token, tenant) {
    return api(token, tenant, `/tenants/${tenant}`);
  },

  getTemplate(token, tenant, uuid) {
    return api(
      token,
      tenant,
      `/endpoints/sip/templates/${uuid}`
    );
  },
};
