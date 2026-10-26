# API & UI tests in Docker

Everything runs in containers: PostgreSQL, the API with Swagger, the React frontend and the test runners.
Nothing but Docker is needed on the host.

## Containers

| Service | Image | What it does | Profile |
|---|---|---|---|
| `db` | `postgres:16` | Database (dev DB `my_database`, test DB `my_database_test`) | dev, ci, e2e |
| `app` | `./Dockerfile` (node:18) | API on http://localhost:3000, Swagger on http://localhost:3000/api-docs | dev, ci, e2e |
| `frontend` | `./frontend/Dockerfile.dev` (node:20) | Vite dev server on http://localhost:5173 | dev, e2e |
| `test` | `./Dockerfile` | Existing mocha suites (`tests/*.test.js`), in-process, own test DB | ci |
| `api-smoke` | `./Dockerfile` | **New** black-box API smoke suites (`smoke/api/*.smoke.js`) over HTTP | smoke |
| `ui-smoke` | `./e2e/Dockerfile` (Playwright) | **New** Playwright UI smoke suites (`e2e/tests/*.spec.js`) | smoke, e2e |

## First-time setup

```bash
cp .env.example .env            # then set CORS_ORIGIN=http://localhost:5173, VITE_API_URL=http://localhost:3000, COMPOSE_PROFILES=dev
cp .env.test.example .env.test
```

`COMPOSE_PROFILES=dev` in `.env` makes a plain `docker-compose up` start db + API + frontend
(every service in `docker-compose.yml` sits behind a profile, so without it nothing starts).

## Commands

```bash
docker-compose up --build -d                 # db + API + Swagger + frontend
docker compose run --rm test                 # existing API test suites (mocha, 86 tests)
docker compose run --rm api-smoke            # new API smoke suites
docker compose run --rm ui-smoke             # new UI smoke suites (Playwright, Chromium)
docker-compose down -v                       # stop everything and delete the DB volume
```

Playwright HTML report: `e2e/playwright-report/index.html` (traces, screenshots and videos of failures
are in `e2e/test-results/`).

## How the UI runner reaches the app

The frontend bundle calls the API at `http://localhost:3000`, and the Vite dev server only answers requests
addressed to `localhost`. Inside the `ui-smoke` container `socat` forwards `localhost:3000 → app:3000` and
`localhost:5173 → frontend:5173`, so the containerised Chromium sees the app exactly like a browser on the host.

## Smoke suites

API (`smoke/api`, mocha + supertest + chai, tagged `@smoke`):

- **Health & Swagger** — `/health`, OpenAPI spec, Swagger UI, helmet headers, 404
- **Auth** — admin login + JWT role, wrong password, validation, self-registration, admin role guard, 401/403
- **Users** — profile without password hash, pagination, admin create → read → delete, employee forbidden
- **Projects** — full lifecycle (create, search, update, assign employee, delete), validation, role guard
- **Notifications** — `employee_created` notification, mark as read, query validation, admin-only

UI (`e2e/tests`, Playwright, tagged `@smoke`):

- **Login** — form renders, protected-route redirect, wrong password error, successful login
- **Navigation** — every header link, 404 page, logout
- **Employees** — employee created via API is searchable and opens its details page, "Add Employee"
- **Projects** — create a project through the dialog and find it in the list

The smoke suites create uniquely named data and clean it up, so they can run repeatedly against the live dev DB.
