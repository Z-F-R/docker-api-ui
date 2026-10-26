// smoke/api/02-auth.smoke.js
const { expect } = require('chai');
const {
  ADMIN,
  api,
  auth,
  login,
  employeePayload,
  decodeJwt,
} = require('./helpers');

describe('@smoke Auth', () => {
  it('default admin can log in and gets a JWT with the admin role', async () => {
    const res = await api().post('/login').send(ADMIN);

    expect(res.status).to.equal(200);
    expect(res.body.token).to.be.a('string');
    expect(res.body.token.split('.')).to.have.lengthOf(3);
    expect(decodeJwt(res.body.token)).to.include({ role: 'admin' });
  });

  it('login with a wrong password is rejected', async () => {
    const res = await api()
      .post('/login')
      .send({ email: ADMIN.email, password: 'wrong-password' });

    expect(res.status).to.equal(400);
    expect(res.body).to.have.property('error');
    expect(res.body).to.not.have.property('token');
  });

  it('login with a malformed email fails validation', async () => {
    const res = await api().post('/login').send({ email: 'not-an-email', password: 'x' });

    expect(res.status).to.equal(400);
    expect(res.body.errors).to.be.an('array').that.is.not.empty;
  });

  it('a new employee can self-register and log in', async () => {
    const payload = employeePayload();

    const register = await api().post('/register').send(payload);
    expect(register.status).to.equal(201);
    expect(register.body).to.have.property('userId');

    const token = await login(payload.email, payload.password);
    expect(decodeJwt(token)).to.include({ role: 'employee', userId: register.body.userId });
  });

  it('registering as admin without the secret word is forbidden', async () => {
    const res = await api()
      .post('/register')
      .send(employeePayload({ role: 'admin' }));

    expect(res.status).to.equal(403);
  });

  it('protected endpoint without a token returns 401', async () => {
    const res = await api().get('/profile');

    expect(res.status).to.equal(401);
  });

  it('protected endpoint with a forged token returns 403', async () => {
    const forged = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiJ9.invalid-signature';
    const res = await api().get('/profile').set(auth(forged));

    expect(res.status).to.equal(403);
  });
});
