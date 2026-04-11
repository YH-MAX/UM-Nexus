# UM Nexus Monorepo Scaffold

UM Nexus is currently scaffolded as a clean monorepo foundation for local development. This setup intentionally includes only the platform shell:

- `apps/web` as a Next.js App Router app with TypeScript and Tailwind CSS
- `apps/api` as a FastAPI service
- `apps/worker` as a minimal Celery worker bootstrap
- `infra/docker/docker-compose.yml` for local infrastructure and service startup

No business features are implemented yet.

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

### Web

```bash
cd apps/web
npm install
npm run dev
```

## Environment Variables

The FastAPI app reads these environment variables:

- `API_PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `APP_ENV`

The root `.env.example` includes safe local defaults for Docker-based development.
If you run the API directly on your host instead of through Docker, use `localhost` in `DATABASE_URL` and `REDIS_URL` instead of the Docker service names.

## Included Checks

- `GET /health` returns:

  ```json
  { "status": "ok" }
  ```

- The web homepage renders:

  ```text
  UM Nexus is running
  ```

## Useful Commands

- `make up` to build and start the stack
- `make down` to stop the stack
- `make logs` to tail compose logs
- `make api-dev` to run FastAPI locally
- `make web-dev` to run Next.js locally
