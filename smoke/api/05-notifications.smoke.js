const { expect } = require('chai');
const {
  api,
  auth,
  loginAsAdmin,
  employeePayload,
  registerEmployee,
  createdData,
} = require('./helpers');

describe('Notifications', () => {
  const created = createdData();
  let adminToken;

  before(async () => {
    adminToken = await loginAsAdmin();
  });

  // Also removes the employee_created notification: it is deleted together with its user
  after(() => created.cleanup());

  it('creating an employee notifies the admin, who can mark it as read @smoke', async () => {
    const res = await api().post('/users').set(auth(adminToken)).send(employeePayload());
    expect(res.status).to.equal(201);
    const userId = created.user(res.body.user.id);

    const list = await api()
      .get('/notifications?type=employee_created&sortBy=createdAt&order=DESC&limit=50')
      .set(auth(adminToken));
    expect(list.status).to.equal(200);
    expect(list.body.notifications).to.be.an('array');

    const notification = list.body.notifications.find((n) => n.relatedUserId === userId);
    expect(notification, 'employee_created notification').to.exist;
    expect(notification.isRead).to.equal(false);

    const marked = await api()
      .patch(`/notifications/${notification.id}/mark-as-read`)
      .set(auth(adminToken));
    expect(marked.status).to.equal(200);

    const reloaded = await api()
      .get('/notifications?type=employee_created&sortBy=createdAt&order=DESC&limit=50')
      .set(auth(adminToken));
    const reread = reloaded.body.notifications.find((n) => n.id === notification.id);
    expect(reread.isRead).to.equal(true);
  });

  it('notifications reject an invalid sortBy value @regression', async () => {
    const res = await api().get('/notifications?sortBy=password').set(auth(adminToken));

    expect(res.status).to.equal(400);
  });

  it('notifications are admin-only @smoke', async () => {
    const employee = await registerEmployee();
    created.user(employee.id);

    const res = await api().get('/notifications').set(auth(employee.token));

    expect(res.status).to.equal(403);
  });
});
