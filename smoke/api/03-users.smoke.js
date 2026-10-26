// smoke/api/03-users.smoke.js
const { expect } = require('chai');
const {
  ADMIN,
  api,
  auth,
  loginAsAdmin,
  employeePayload,
  registerEmployee,
} = require('./helpers');

describe('@smoke Users', () => {
  let adminToken;

  before(async () => {
    adminToken = await loginAsAdmin();
  });

  it('GET /profile returns the current user without the password hash', async () => {
    const res = await api().get('/profile').set(auth(adminToken));

    expect(res.status).to.equal(200);
    expect(res.body).to.include({ email: ADMIN.email, role: 'admin' });
    expect(res.body).to.not.have.property('password');
  });

  it('GET /users returns a paginated list', async () => {
    const res = await api().get('/users?page=1&limit=5').set(auth(adminToken));

    expect(res.status).to.equal(200);
    expect(res.body.users).to.be.an('array').that.is.not.empty;
    expect(res.body.users.length).to.be.at.most(5);
    expect(res.body.total).to.be.at.least(1);
    expect(res.body.page).to.equal(1);
  });

  it('admin can create, read and delete an employee', async () => {
    const payload = employeePayload();

    const created = await api().post('/users').set(auth(adminToken)).send(payload);
    expect(created.status).to.equal(201);
    const { id } = created.body.user;
    expect(created.body.user).to.include({ email: payload.email, role: 'employee' });
    expect(created.body.user).to.not.have.property('password');

    const fetched = await api().get(`/users/${id}`).set(auth(adminToken));
    expect(fetched.status).to.equal(200);
    expect(fetched.body).to.include({ id, firstName: payload.firstName });

    const deleted = await api().delete(`/users/${id}`).set(auth(adminToken));
    expect(deleted.status).to.equal(200);

    const gone = await api().get(`/users/${id}`).set(auth(adminToken));
    expect(gone.status).to.equal(404);
  });

  it('employee is not allowed to create users', async () => {
    const employee = await registerEmployee();

    const res = await api()
      .post('/users')
      .set(auth(employee.token))
      .send(employeePayload());

    expect(res.status).to.equal(403);
  });
});
