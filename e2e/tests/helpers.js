// Test data is prepared and cleaned up through the API, so UI tests only check the UI.
// ADMIN and uid deliberately repeat smoke/api/helpers.js: the e2e package is built into
// its own image and does not share code with the API smoke suites.
const API_URL = process.env.API_URL || 'http://localhost:3000';

const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'adminpassword',
};

const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

// One admin login per worker process instead of one per API call
let adminToken;

async function adminHeaders(request) {
  if (!adminToken) {
    const res = await request.post(`${API_URL}/login`, { data: ADMIN });
    if (!res.ok()) throw new Error(`Admin API login failed: ${res.status()}`);
    ({ token: adminToken } = await res.json());
  }
  return { Authorization: `Bearer ${adminToken}` };
}

// Cleanup does not fail the test, but a failed delete is reported so leftovers get noticed
async function cleanupDelete(request, path, headers) {
  const res = await request.delete(`${API_URL}${path}`, { headers });
  // 404: already gone
  if (!res.ok() && res.status() !== 404) {
    console.warn(`Cleanup DELETE ${path} failed: ${res.status()} ${await res.text()}`);
  }
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

// Also deletes the employee_created notification: it cascades with the user
async function deleteEmployee(request, id) {
  await cleanupDelete(request, `/users/${id}`, await adminHeaders(request));
}

async function deleteProjectByName(request, name) {
  const headers = await adminHeaders(request);
  const res = await request.get(`${API_URL}/projects`, { headers, params: { search: name } });
  if (!res.ok()) {
    console.warn(`Cleanup: project search for "${name}" failed: ${res.status()}`);
    return;
  }
  const { projects = [] } = await res.json();
  for (const project of projects.filter((p) => p.name === name)) {
    await cleanupDelete(request, `/projects/${project.id}`, headers);
  }
}

module.exports = { API_URL, ADMIN, uid, createEmployee, deleteEmployee, deleteProjectByName };
