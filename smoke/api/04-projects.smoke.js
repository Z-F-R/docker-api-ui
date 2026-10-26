// smoke/api/04-projects.smoke.js
const { expect } = require('chai');
const { api, auth, loginAsAdmin, uid, registerEmployee } = require('./helpers');

describe('@smoke Projects', () => {
  let adminToken;
  let employee;

  before(async () => {
    adminToken = await loginAsAdmin();
    employee = await registerEmployee();
  });

  it('admin can run the full project lifecycle', async () => {
    const name = `Smoke Project ${uid()}`;

    // Create
    const created = await api()
      .post('/projects')
      .set(auth(adminToken))
      .send({ name, description: 'Created by the API smoke suite', wage: 1500, active: true });
    expect(created.status).to.equal(201);
    const { id } = created.body.project;
    expect(created.body.project).to.include({ name, active: true });

    // Find by search
    const list = await api()
      .get(`/projects?search=${encodeURIComponent(name)}`)
      .set(auth(adminToken));
    expect(list.status).to.equal(200);
    expect(list.body.projects.map((p) => p.id)).to.include(id);

    // Update
    const updated = await api()
      .put(`/projects/${id}`)
      .set(auth(adminToken))
      .send({ name, description: 'Updated by the API smoke suite', active: false });
    expect(updated.status).to.equal(200);
    expect(updated.body.project).to.include({ active: false });

    // Assign employee
    const assigned = await api()
      .post(`/projects/${id}/employee`)
      .set(auth(adminToken))
      .send({ employeeId: employee.id });
    expect(assigned.status).to.equal(200);

    const members = await api().get(`/projects/${id}/employees`).set(auth(adminToken));
    expect(members.status).to.equal(200);
    expect(members.body.employees.map((e) => e.id)).to.include(employee.id);

    // Delete
    const deleted = await api().delete(`/projects/${id}`).set(auth(adminToken));
    expect(deleted.status).to.equal(200);

    const gone = await api().get(`/projects/${id}`).set(auth(adminToken));
    expect(gone.status).to.equal(404);
  });

  it('project creation validates required fields', async () => {
    const res = await api()
      .post('/projects')
      .set(auth(adminToken))
      .send({ name: '', description: 'short' });

    expect(res.status).to.equal(400);
    expect(res.body.errors).to.be.an('array').with.length.at.least(2);
  });

  it('employee can view projects but cannot create them', async () => {
    const list = await api().get('/projects').set(auth(employee.token));
    expect(list.status).to.equal(200);

    const res = await api()
      .post('/projects')
      .set(auth(employee.token))
      .send({ name: `Forbidden ${uid()}`, description: 'Employees must not create projects' });
    expect(res.status).to.equal(403);
  });
});
