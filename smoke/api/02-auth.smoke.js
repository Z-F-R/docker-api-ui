const { expect } = require('chai');
const {
  ADMIN,
  api,
  auth,
  login,
  employeePayload,
  decodeJwt,
  createdData,
} = require('./helpers');

describe('Auth', () => {
  const created = createdData();

  after(() => created.cleanup());

  it('default admin can log in and gets a JWT with the admin role @smoke', async () => {
    const res = await api().post('/login').send(ADMIN);

    expect(res.status).to.equal(200);
    expect(res.body.token).to.be.a('string');
    expect(res.body.token.split('.')).to.have.lengthOf(3);
    expect(decodeJwt(res.body.token)).to.include({ role: 'admin' });
  });

  it('login with a wrong password is rejected @smoke', async () => {
    const res = await api()
      .post('/login')
      .send({ email: ADMIN.email, password: 'wrong-password' });

    // Known app issue: wrong credentials get 400 Bad Request, while 401 Unauthorized is the
    // conventional status. Asserted as the app behaves today, see DOCKER_TESTS.md "Known app issues".
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property('error');
    expect(res.body).to.not.have.property('token');
  });

  it('login with a malformed email fails validation @regression', async () => {
    const res = await api().post('/login').send({ email: 'not-an-email', password: 'x' });

    expect(res.status).to.equal(400);
    expect(res.body.errors).to.be.an('array').that.is.not.empty;
  });

  it('a new employee can self-register and log in @smoke', async () => {
    const payload = employeePayload();

    const register = await api().post('/register').send(payload);
    expect(register.status).to.equal(201);
    expect(register.body).to.have.property('userId');
    created.user(register.body.userId);

    const token = await login(payload.email, payload.password);
    expect(decodeJwt(token)).to.include({ role: 'employee', userId: register.body.userId });
  });

  it('registering as admin without the secret word is forbidden @smoke', async () => {
    const res = await api()
      .post('/register')
      .send(employeePayload({ role: 'admin' }));
    // If the guard is ever broken, the unexpected admin must not stay in the DB
    if (res.body.userId) created.user(res.body.userId);

    expect(res.status).to.equal(403);
  });

  it('protected endpoint without a token returns 401 @smoke', async () => {
    const res = await api().get('/profile');

    expect(res.status).to.equal(401);
  });

  it('protected endpoint with a forged token is rejected @regression', async () => {
    const forged = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiJ9.invalid-signature';
    const res = await api().get('/profile').set(auth(forged));

    // Known app issue: an invalid token gets 403 Forbidden, while 401 Unauthorized is the
    // conventional status (403 means "authenticated, but not allowed").
    // Asserted as the app behaves today, see DOCKER_TESTS.md "Known app issues".
    expect(res.status).to.equal(403);
  });
});
