// smoke/api/01-health-docs.smoke.js
const { expect } = require('chai');
const { api } = require('./helpers');

describe('@smoke Health & Swagger', () => {
  it('GET /health reports the API is up', async () => {
    const res = await api().get('/health');

    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ status: 'ok' });
  });

  it('GET /api-docs.json serves an OpenAPI spec with the core endpoints', async () => {
    const res = await api().get('/api-docs.json');

    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.match(/application\/json/);
    expect(res.body.openapi).to.match(/^3\./);
    expect(res.body.paths).to.include.keys(
      '/login',
      '/register',
      '/profile',
      '/users',
      '/projects',
      '/notifications'
    );
  });

  it('GET /api-docs/ serves the Swagger UI page', async () => {
    const res = await api().get('/api-docs/');

    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.match(/text\/html/);
    expect(res.text).to.include('swagger-ui');
  });

  it('sends security headers (helmet)', async () => {
    const res = await api().get('/health');

    expect(res.headers).to.have.property('x-content-type-options', 'nosniff');
    expect(res.headers).to.not.have.property('x-powered-by');
  });

  it('unknown route returns 404', async () => {
    const res = await api().get('/definitely-not-a-route');

    expect(res.status).to.equal(404);
  });
});
