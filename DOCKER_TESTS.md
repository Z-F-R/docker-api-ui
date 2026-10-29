# API & UI tests in Docker

The application (API, frontend, database schema and the 86 existing mocha tests) comes from
[dreamquality/employee-management-crm](https://github.com/dreamquality/employee-management-crm).
This repository adds the Docker setup to run it together with the test runners, and black-box smoke suites
for the API and the UI. The application code is left as it is: bugs the suites found in it are listed under
[Known app issues](#known-app-issues).

Everything runs in containers: PostgreSQL, the API with Swagger, the React frontend and the test runners.
Only Docker with Compose v2 (`docker compose`) is needed on the host.

## Quick start

From a fresh clone, copy and paste:

```bash
git clone https://github.com/Z-F-R/docker-api-ui.git
cd docker-api-ui
cp .env.docker.example .env
cp .env.test.example .env.test
docker compose up --build --detach --wait
docker compose run --rm test
docker compose run --rm api-smoke
docker compose run --rm ui-smoke
docker compose down -v
```

| Command | What it does |
|---|---|
| `docker compose up --build --detach --wait` | db + API + Swagger + frontend, returns once they are healthy |
| `docker compose run --rm test` | existing API test suites (mocha, 86 tests, in-process, own test DB) |
| `docker compose run --rm api-smoke` | API smoke suites over HTTP |
| `docker compose run --rm ui-smoke` | UI smoke suites (Playwright, Chromium) |
| `docker compose down -v` | stops everything and deletes the DB volume |

`.env.docker.example` is `.env.example` plus three settings: `CORS_ORIGIN=http://localhost:5173` and
`VITE_API_URL=http://localhost:3000` for a browser on your machine, and `COMPOSE_PROFILES=dev`, so a plain
`docker compose up` starts db + API + frontend (every service sits behind a profile, so without it nothing starts).
`.env.example` stays without `COMPOSE_PROFILES`, because the CI job copies it and picks its profile itself.

App: http://localhost:5173 (admin `admin@example.com` / `adminpassword`), Swagger: http://localhost:3000/api-docs.

## Containers

| Service | Image | What it does | Profiles |
|---|---|---|---|
| `db` | `postgres:16` | Database (dev DB `my_database`, test DB `my_database_test`) | dev, ci, smoke, e2e |
| `app` | `./Dockerfile` (node:18) | API on http://localhost:3000, Swagger on http://localhost:3000/api-docs | dev, ci, smoke, e2e |
| `frontend` | `./frontend/Dockerfile.dev` (node:20) | Vite dev server on http://localhost:5173 | dev, smoke, e2e |
| `test` | `./Dockerfile` | Existing mocha suites (`tests/*.test.js`) | ci |
| `api-smoke` | `./Dockerfile` | Black-box API smoke suites (`smoke/api/*.smoke.js`) | smoke |
| `ui-smoke` | `./e2e/Dockerfile` (Playwright) | Playwright UI smoke suites (`e2e/tests/*.spec.js`) | smoke, e2e |

`docker compose run <service>` starts a service whatever its profile. The `smoke` profile brings up the whole
stack with both runners; `e2e` is the one-shot UI run that exits with the Playwright result:

```bash
docker compose --profile e2e up --build --abort-on-container-exit --exit-code-from ui-smoke
docker compose --profile e2e down -v
```

`down` acts on the active profiles only, so after an `e2e` run name the profile, or the stopped `ui-smoke`
container stays behind.

The runners get only the variables they need (`API_URL`, `CI`, `HOST_UID`/`HOST_GID`), not the DB password or
the JWT secret from `.env`.

## Smoke suites

API (`smoke/api`, mocha + supertest + chai):

- **Health & Swagger** — `/health`, OpenAPI spec, Swagger UI, helmet headers, 404
- **Auth** — admin login + JWT role, wrong password, malformed email, self-registration, admin role guard, 401/403
- **Users** — profile without password hash, pagination, admin create → read → delete, employee forbidden
- **Projects** — full lifecycle (create, search, update, assign employee, delete), validation, role guard
- **Notifications** — `employee_created` notification, mark as read, query validation, admin-only

UI (`e2e/tests`, Playwright, every suite tagged `@smoke`):

- **Login** — form renders, protected-route redirect, wrong password error, successful login
- **Navigation** — every header link, 404 page, logout
- **Employees** — employee created via API is searchable and opens its details page, "Add Employee"
- **Projects** — create a project through the dialog and find it in the list

### Tags: smoke and regression

Each API test title ends with a tag:

- `@smoke` — critical paths. `docker compose run --rm api-smoke` runs only these (`npm run test:smoke`) and
  stops at the first failure (`--bail`); the cleanup hooks still run.
- `@regression` — validation and edge cases (malformed email, forged token, project validation, invalid `sortBy`,
  helmet headers, unknown route). They run with the full set:

```bash
docker compose run --rm api-smoke npm run test:smoke:all
```

### Test data

Every suite creates uniquely named data through the API, records what it created and deletes it in an
`after()`/`afterEach()` hook, also when a test fails midway. Deleting a user also deletes its notifications
(`notifications.relatedUserId` is `ON DELETE CASCADE`). A failed delete is logged with its status. So the suites can
run again and again against the live dev DB and leave it as they found it.

### Changing the tests

- `e2e/tests` and `e2e/playwright.config.js` are mounted into `ui-smoke`, `smoke/` into `api-smoke`: edits are
  picked up by the next `docker compose run`, no rebuild needed.
- npm scripts and dependencies are baked into the images: after changing `package.json` or `e2e/package.json`,
  run `docker compose build api-smoke` or `docker compose build ui-smoke`.

## Reports

Playwright HTML report: `e2e/playwright-report/index.html`; traces, screenshots and videos of failures are in
`e2e/test-results/`. In CI both folders are uploaded as the `playwright-report` artifact, also when tests fail.

`CI` is passed through from the host: GitHub Actions sets it (1 retry, `test.only` forbidden), locally it is empty.

The runner writes the reports as root. Docker Desktop maps that to your user; on a Linux host pass your ids,
so the report folders belong to you and can be deleted without `sudo`:

```bash
HOST_UID=$(id -u) HOST_GID=$(id -g) docker compose run --rm ui-smoke
```

## How the UI runner reaches the app

The frontend bundle calls the API at `http://localhost:3000`, and the Vite dev server only answers requests
addressed to `localhost`. Inside the `ui-smoke` container `socat` forwards `localhost:3000 → app:3000` and
`localhost:5173 → frontend:5173`, so the containerised Chromium sees the app exactly like a browser on the host.

## Known app issues

Found by the suites in the application code, which this repository does not change. The tests assert the current
behaviour and point here, so a fix in the app shows up as a failing test to update.

| # | Issue | Where it shows | Test |
|---|---|---|---|
| 1 | Wrong credentials return `400 Bad Request`; `401 Unauthorized` is the conventional status | `POST /login` | `02-auth.smoke.js`, `login.smoke.spec.js` |
| 2 | A forged or invalid JWT returns `403 Forbidden`; `403` means "authenticated, but not allowed", an invalid token is `401` | auth middleware | `02-auth.smoke.js` |
| 3 | Toasts on `/login` and `/register` never render: `<Toaster />` is mounted only in `Layout.jsx`, so a wrong password gives the user no message | `frontend/src/components/Layout.jsx` | `login.smoke.spec.js`, marked `test.fail()` |
| 4 | The view (eye) button on an employee card is icon-only and has no accessible name, so screen readers and `getByRole` cannot find it; the spec locates it by its icon class | `frontend/src/pages/EmployeesPage.jsx` | `employees.smoke.spec.js` |
