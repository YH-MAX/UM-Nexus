# UM Nexus Monorepo

UM Nexus now includes the platform foundation for:

- `apps/web` with Next.js App Router, Supabase Auth client integration, and UM-only signup validation
- `apps/api` with FastAPI, SQLAlchemy 2.x, Alembic, Supabase JWT verification, and shared core entities
- `apps/worker` as a Celery bootstrap
- `infra/docker/docker-compose.yml` for local infrastructure and service startup

Forum, societies, and EventOps remain out of scope. Trade now has a demo-mode decision intelligence slice.

## Trade Intelligence Demo Slice

The Trade Intelligence slice runs in demo mode without login/register. It uses a fixed demo user, historical campus comparables, deterministic scoring, and Celery-backed enrichment tasks:

- `POST /api/v1/listings`
- `POST /api/v1/listings/{id}/images`
- `POST /api/v1/wanted-posts`
- `POST /api/v1/ai/trade/enrich-listing/{listing_id}` returns an accepted job response
- `GET /api/v1/ai/trade/result/{listing_id}` returns `not_started`, `pending`, `running`, `completed`, or `failed`
- `GET /api/v1/listings/{id}/matches`
- `POST /api/v1/ai/trade/evaluation/run`
- `GET /api/v1/ai/trade/evaluation/summary`
- `GET /api/v1/ai/trade/evaluation/cases`

The completed result includes recommendation, why, expected outcome, and action sections.

Seed demo marketplace data after migrations:

```bash
cd apps/api
python scripts/seed_trade_demo.py
```

Or with make:

```bash
make api-seed-trade
```

Seed the labelled benchmark scenarios separately if you want them before opening the evaluation pages:

```bash
make api-seed-benchmarks
```

Frontend demo pages:

- `/trade`
- `/trade/demo`
- `/trade/sell`
- `/trade/want`
- `/trade/[id]`
- `/wanted-posts/[id]`
- `/trade/evaluation`

For local demos, `CELERY_TASK_ALWAYS_EAGER=true` runs Celery tasks immediately inside the API process. Set it to `false` and run a worker when you want real background processing.

## Z.AI GLM Backend Integration

Trade Intelligence can run through Z.AI GLM from the backend only using the official `zai-sdk` package. The API key is never sent to the frontend and should only live in the backend environment.

Required backend variables:

```env
GLM_PROVIDER=zai
ZAI_API_KEY=your_zai_api_key
ZAI_BASE_URL=https://api.z.ai/api/paas/v4
ZAI_MODEL=glm-4.6v
ZAI_TIMEOUT_SECONDS=60
ZAI_MAX_RETRIES=2
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_STORAGE_BUCKET=listing-images
```

`GLM_PROVIDER=demo` keeps the offline deterministic demo provider. Setting `GLM_PROVIDER=zai`, or providing `ZAI_API_KEY` for local backend runs, switches enrichment to the Z.AI provider. Change `ZAI_MODEL` to switch models later without code changes. `ZAI_BASE_URL` defaults to Z.AI's production endpoint: `https://api.z.ai/api/paas/v4`.

Connectivity check:

```bash
curl http://localhost:8001/api/v1/ai/trade/test-glm
```

Run GLM-backed enrichment:

```bash
curl -X POST http://localhost:8001/api/v1/ai/trade/enrich-listing/<listing_id>
curl http://localhost:8001/api/v1/ai/trade/result/<listing_id>
```

The SDK handles Bearer auth with the backend `ZAI_API_KEY`. Logs redact secrets and only record request status, model, and safe metadata. Multimodal image inputs must use public HTTPS URLs; localhost, plain HTTP, and private network image URLs are skipped and the decision pipeline continues with text-only analysis.

## Benchmark Evaluation And Judge Demo

The hackathon-facing validation layer compares UM Nexus Trade Intelligence against a deliberately simple baseline. This is not a production marketplace KPI system yet; it is a scenario-based decision-intelligence benchmark that makes the economic value visible to judges.

Benchmark cases represent common campus resale decisions:

- fair textbook pricing
- overpriced calculator
- underpriced rice cooker
- suspicious electronics listing
- low-detail dorm item
- strong same-KK buyer match
- weak match/no exact buyer case
- move-out mini fridge demand
- missing-image study lamp
- counterfeit or unsafe electronics listing

The baseline engine is intentionally simple:

- price = same-category historical average
- matches = same category and budget overlap
- risk = a small suspicious-keyword list plus broad price deviation
- action = simple threshold rules

The AI decision engine is scored against the same labelled cases using:

- pricing accuracy against the expected fair price band
- risk-level agreement
- action-type agreement
- match-count quality
- composite score from pricing, risk, action, and match quality

The evaluation summary also reports demo-stage impact metrics:

- AI overall score vs baseline score
- pricing accuracy lift
- risky-listing detection lift
- action agreement lift
- match quality lift
- average time-to-sale proxy improvement
- estimated buyer search time saved

The time-to-sale metric is a transparent proxy derived from expected outcome text, action type, risk, price fit, and match availability. It is useful for scenario validation because the competition allows simulated validation, but it should not be presented as a live deployment metric.

Run the benchmark from the API:

```bash
curl -X POST http://localhost:8001/api/v1/ai/trade/evaluation/run
curl http://localhost:8001/api/v1/ai/trade/evaluation/summary
```

Or open:

- `http://localhost:3000/trade/demo`
- `http://localhost:3000/trade/evaluation`

This supports the core competition claim: if the GLM decision layer is removed, the system falls back to category averages and simple thresholds, losing multimodal condition reasoning, context-aware buyer matching, explainable action recommendations, and measurable decision-quality lift.

### Supabase Storage Listing Images

Real listing uploads go through backend Supabase Storage using the service role key. Create a public Storage bucket, for example:

```env
SUPABASE_STORAGE_BUCKET=listing-images
```

The upload flow is:

1. `POST /api/v1/listings` creates the listing in demo mode.
2. `POST /api/v1/listings/{listing_id}/images` accepts `multipart/form-data` with a `file` field.
3. The backend validates `jpg`, `jpeg`, `png`, or `webp`, enforces `MAX_UPLOAD_FILE_SIZE_BYTES`, and uploads to:

   ```text
   listings/{listing_id}/{generated_filename}
   ```

4. The backend stores both `media_assets` and `listing_images` rows with the Supabase bucket, storage path, public URL, MIME type, and file size.
5. Trade enrichment sends only valid public HTTPS image URLs to Z.AI alongside listing text, historical comparables, wanted-post matches, and risk signals.

Public URLs are required because Z.AI must be able to fetch the image from outside your local machine. If you run the API locally and keep images only at `localhost`, the model cannot access them, so the pipeline logs the skipped images and falls back to text-only analysis.

To test locally without live provider or live storage, run:

```bash
cd apps/api
.venv\Scripts\python.exe -m pytest
```

The test suite mocks Supabase Storage and Z.AI SDK calls. To test the full multimodal path manually, configure the Supabase bucket as public, set `GLM_PROVIDER=zai`, set `ZAI_API_KEY`, upload a listing image from `/trade/sell`, then run enrichment from `/trade/{id}`.

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
- `SUPABASE_STORAGE_BUCKET`
- `ALLOWED_EMAIL_DOMAINS`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS`
- `GLM_PROVIDER`
- `ZAI_API_KEY`
- `ZAI_BASE_URL`
- `ZAI_MODEL`
- `ZAI_TIMEOUT_SECONDS`
- `ZAI_MAX_RETRIES`

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
