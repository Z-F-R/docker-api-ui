// smoke/api/05-notifications.smoke.js
const { expect } = require('chai');
const {
  api,
  auth,
  loginAsAdmin,
  employeePayload,
  registerEmployee,
} = require('./helpers');

describe('@smoke Notifications', () => {
  let adminToken;
  let createdUserId;

  before(async () => {
    adminToken = await loginAsAdmin();
  });

  after(async () => {
    if (createdUserId) {
      await api().delete(`/users/${createdUserId}`).set(auth(adminToken));
    }
  });

  it('creating an employee notifies the admin, who can mark it as read', async () => {
    const created = await api().post('/users').set(auth(adminToken)).send(employeePayload());
    expect(created.status).to.equal(201);
    createdUserId = created.body.user.id;

    const list = await api()
      .get('/notifications?type=employee_created&sortBy=createdAt&order=DESC&limit=50')
      .set(auth(adminToken));
    expect(list.status).to.equal(200);
    expect(list.body.notifications).to.be.an('array');

    const notification = list.body.notifications.find((n) => n.relatedUserId === createdUserId);
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

  it('notifications reject an invalid sortBy value', async () => {
    const res = await api().get('/notifications?sortBy=password').set(auth(adminToken));

    expect(res.status).to.equal(400);
  });

  it('notifications are admin-only', async () => {
    const employee = await registerEmployee();
    const res = await api().get('/notifications').set(auth(employee.token));

    expect(res.status).to.equal(403);
  });
});
