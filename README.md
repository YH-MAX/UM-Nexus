# UM Nexus Monorepo

UM Nexus now includes the platform foundation for:

- `apps/web` with Next.js App Router, Supabase Auth client integration, and UM-only signup validation
- `apps/api` with FastAPI, SQLAlchemy 2.x, Alembic, Supabase JWT verification, and shared core entities
- `apps/worker` as a Celery bootstrap
- `infra/docker/docker-compose.yml` for local infrastructure and service startup

Business modules such as forum, trade, and EventOps are still intentionally out of scope at this stage.

## Project Structure

```text
.
|-- apps
|   |-- api
|   |-- web
|   `-- worker
|-- infra
|   `-- docker
|       `-- docker-compose.yml
|-- .env.example
|-- .gitignore
|-- Makefile
`-- README.md
```

## Prerequisites

- Docker Desktop or Docker Engine with Compose
- Node.js 20+
- Python 3.12+

## Quick Start With Docker

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

   On PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Start the full local stack:

   ```bash
   make up
   ```

   If `make` is unavailable on Windows, run:

   ```bash
   docker compose --env-file .env -f infra/docker/docker-compose.yml up --build
   ```

3. Open the services:

- Web: `http://localhost:3000`
- API health check: `http://localhost:8001/health`
- API current user endpoint: `http://localhost:8001/api/v1/auth/me`

## Local Development Without Docker

### API

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On PowerShell:

```powershell
cd apps/api
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Run migrations:

```bash
cd apps/api
alembic upgrade head
```

### Web

```bash
cd apps/web
npm install
npm run dev
```

## Environment Variables

The root `.env.example` defines the shared local contract:

- `API_PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWKS_URL`
- `ALLOWED_EMAIL_DOMAINS`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS`

If you run the API directly on your host instead of through Docker, use the real Supabase Postgres connection string in `DATABASE_URL` or switch hostnames like `postgres` and `redis` to `localhost`.

For local frontend-only runs, mirror the public Supabase values in `apps/web/.env.local`.

## Supabase Setup Notes

Configure these items in your Supabase project before testing auth end to end:

- Enable email/password auth in Supabase Auth
- Set the Site URL to `http://localhost:3000`
- Add redirect URLs for `http://localhost:3000` and `http://localhost:3000/auth/callback` if you later enable callback-based flows
- Use a JWKS URL in the format `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`
- Use UM domains such as `siswa.um.edu.my` and `um.edu.my` in `ALLOWED_EMAIL_DOMAINS`

## Database Foundation

The API now includes:

- SQLAlchemy engine, session factory, declarative base, and DB dependency
- Alembic wired to application metadata
- First migration for shared platform entities
- `create extension if not exists vector;` in the initial migration

Core tables created by the first migration:

- `users`
- `profiles`
- `societies`
- `notifications`
- `media_assets`

`users.id` is designed to match the Supabase Auth user ID from the JWT `sub` claim.

## Auth Foundation

Frontend auth:

- Supabase JS client is configured in `apps/web`
- `/login` and `/signup` use Supabase email/password auth
- signup is blocked on the frontend if the email domain is not in `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS`

Backend auth:

- FastAPI verifies Supabase bearer tokens against the configured JWKS
- `GET /api/v1/auth/me` verifies the token and syncs the local user/profile
- `PATCH /api/v1/users/me/profile` updates editable profile fields
- `PATCH /api/v1/users/{user_id}/role` is admin-only

Local user sync behavior:

- the first authenticated request creates a local `users` row if missing
- the local profile is also created automatically with `app_role = student`
- access is rejected with `403` if the email domain is outside `ALLOWED_EMAIL_DOMAINS`

Why `app_role` lives in our database:

- Supabase JWT claims are identity/authentication data
- UM Nexus needs application roles for business authorization
- storing `profiles.app_role` locally gives us a controlled, auditable authorization source for future forum, trade, and EventOps permissions

## Included Checks

- `GET /health` returns:

  ```json
  { "status": "ok" }
  ```

- The web homepage renders:

  ```text
  UM Nexus is running
  ```

- `GET /api/v1/auth/me` returns the synced local user/profile when called with a valid Supabase bearer token

## Useful Commands

- `make up` to build and start the stack
- `make down` to stop the stack
- `make logs` to tail compose logs
- `make api-dev` to run FastAPI locally
- `make web-dev` to run Next.js locally
