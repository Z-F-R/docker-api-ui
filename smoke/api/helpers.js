// smoke/api/helpers.js
// Shared helpers for black-box API smoke suites.
// Unlike tests/*.test.js (which import app.js in-process and reset the DB),
// these suites talk to a running API over HTTP and never touch the database directly.
const request = require('supertest');

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Default admin created by app.js on first start
const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'adminpassword',
};

const api = () => request(API_URL);

const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function login(email, password) {
  const res = await api().post('/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login as ${email} failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
}

const loginAsAdmin = () => login(ADMIN.email, ADMIN.password);

// Unique suffix so suites can be re-run against the same (non-reset) database
const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

function employeePayload(overrides = {}) {
  const id = uid();
  return {
    email: `smoke.${id}@example.com`,
    password: 'smoke123',
    firstName: 'Smoke',
    lastName: `Tester${id.slice(-6)}`,
    middleName: 'Auto',
    birthDate: '1995-05-05',
    phone: '+10000000000',
    programmingLanguage: 'JavaScript',
    ...overrides,
  };
}

// Self-registers an employee and returns { id, email, password, token }
async function registerEmployee() {
  const payload = employeePayload();
  const res = await api().post('/register').send(payload);
  if (res.status !== 201) {
    throw new Error(`Register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const token = await login(payload.email, payload.password);
  return { id: res.body.userId, email: payload.email, password: payload.password, token };
}

function decodeJwt(token) {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

module.exports = {
  API_URL,
  ADMIN,
  api,
  auth,
  login,
  loginAsAdmin,
  uid,
  employeePayload,
  registerEmployee,
  decodeJwt,
};
