// e2e/tests/helpers.js
// Test data is prepared and cleaned up through the API, so UI tests only check the UI.
const API_URL = process.env.API_URL || 'http://localhost:3000';

const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'adminpassword',
};

const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function adminHeaders(request) {
  const res = await request.post(`${API_URL}/login`, { data: ADMIN });
  if (!res.ok()) throw new Error(`Admin API login failed: ${res.status()}`);
  const { token } = await res.json();
  return { Authorization: `Bearer ${token}` };
}

async function createEmployee(request) {
  const id = uid();
  const data = {
    email: `ui.smoke.${id}@example.com`,
    password: 'smoke123',
    firstName: `Ui${id.slice(-8)}`,
    lastName: 'Smoketest',
    middleName: 'Auto',
    birthDate: '1995-05-05',
    phone: '+10000000000',
    programmingLanguage: 'JavaScript',
  };
  const res = await request.post(`${API_URL}/users`, {
    headers: await adminHeaders(request),
    data,
  });
  if (res.status() !== 201) throw new Error(`Create employee failed: ${res.status()}`);
  const { user } = await res.json();
  return { ...data, id: user.id, fullName: `${data.firstName} ${data.lastName}` };
}

async function deleteEmployee(request, id) {
  await request.delete(`${API_URL}/users/${id}`, { headers: await adminHeaders(request) });
}

async function deleteProjectByName(request, name) {
  const headers = await adminHeaders(request);
  const res = await request.get(`${API_URL}/projects`, { headers, params: { search: name } });
  const { projects = [] } = await res.json();
  for (const project of projects.filter((p) => p.name === name)) {
    await request.delete(`${API_URL}/projects/${project.id}`, { headers });
  }
}

module.exports = { API_URL, ADMIN, uid, createEmployee, deleteEmployee, deleteProjectByName };
