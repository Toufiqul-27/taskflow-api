# TaskFlow API

A portfolio-ready **TypeScript REST API** for authenticated users to manage their own tasks. This is a small, functional backend project—not a hosted production service.

## Built with

Node.js 22 · Express · TypeScript · PostgreSQL · Prisma ORM · JWT · bcrypt · Zod · Vitest · Docker Compose

## Features

- Register/login with salted password hashing (bcrypt) and 12-hour JWT access tokens
- Authenticated, **owner-scoped** task create/read/update/delete (no cross-user access)
- Status, priority and due dates; paginated filtering by status/priority
- Validation with Zod; clear HTTP status codes; auth endpoint rate limiting
- Centralized error handling, CORS and Helmet headers
- OpenAPI specification in [docs/openapi.yaml](docs/openapi.yaml)
- Unit tests for input validators; GitHub Actions runs tests and TypeScript build

## Run locally

Requirements: **Node.js 22+** and Docker (or an existing PostgreSQL server).

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:generate
npm run db:push
npm run dev
```

On Windows PowerShell, copy `.env.example` to `.env` with `Copy-Item .env.example .env`.

**Important:** Replace the demo `JWT_SECRET` in `.env` with a randomly generated secret (32+ characters). The database credentials in `docker-compose.yml` are intentionally for **local development only**. Do not reuse them in a deployed environment.

Visit `http://localhost:4000/api/health`.

## Quick API walkthrough

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo User","email":"demo@example.com","password":"strong-pass-123"}'

# Copy the returned token. Then:
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Write API tests","priority":"HIGH"}'

curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/tasks?status=TODO&page=1&limit=10"
```

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/health` | Public |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET, POST | `/api/tasks` | JWT |
| GET, PATCH, DELETE | `/api/tasks/:id` | JWT, task owner |

## Quality checks

```bash
npm test
npm run build
```

CI covers schema validation tests and TypeScript compilation; **database integration tests are not yet included**. For a production version, add Prisma migrations, integration tests, HTTPS, refresh-token/session management, audit logging, and careful infrastructure secrets management.

## Author

[Toufiqul Islam](https://github.com/Toufiqul-27)
