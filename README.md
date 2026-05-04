# UM Nexus Monorepo

UM Nexus now includes the platform foundation for:

- `apps/web` with Next.js App Router, Supabase Auth client integration, and UM-only signup validation
- `apps/api` with FastAPI, SQLAlchemy 2.x, Alembic, Supabase JWT verification, and shared core entities
- `apps/worker` as a Celery bootstrap
- `infra/docker/docker-compose.yml` for local infrastructure and service startup

Forum, societies, and EventOps remain out of scope. Trade is positioned as the launchable campus marketplace product.

## UM Nexus Trade Platform

UM Nexus Trade is a University of Malaya campus marketplace for student resale. It supports authenticated seller listings, wanted posts, image uploads, AI-assisted price guidance, buyer-seller matching, trust review, and transaction outcome capture. The product direction is launch-ready marketplace behavior: real users, real inventory, real moderation, and measurable trade outcomes.

- `POST /api/v1/listings`
- `POST /api/v1/listings/{id}/images`
- `POST /api/v1/wanted-posts`
- `POST /api/v1/ai/trade/enrich-listing/{listing_id}` returns an accepted job response
- `GET /api/v1/ai/trade/result/{listing_id}` returns `not_started`, `pending`, `running`, `completed`, or `failed`
- `GET /api/v1/listings/{id}/matches`
- `GET /api/v1/wanted-posts/{id}/recommended-listings`
- `POST /api/v1/listings/{id}/decision-feedback`
- `GET /api/v1/ai/trade/provider-status`
- `POST /api/v1/ai/trade/price-simulation/{listing_id}`
- `POST /api/v1/ai/trade/evaluation/run` for admin quality checks
- `GET /api/v1/ai/trade/evaluation/summary` for admin quality checks
- `GET /api/v1/ai/trade/evaluation/cases` for admin quality checks

The completed result includes recommendation, why, expected outcome, and action sections.

Seed starter marketplace data after migrations:

```bash
cd apps/api
python scripts/seed_trade_demo.py
```

Or with make:

```bash
make api-seed-trade
```

Seed the labelled quality scenarios separately if you want them before opening the internal evaluation pages:

```bash
make api-seed-benchmarks
```

Import additional historical sale evidence from CSV when you want the pricing engine to learn from a larger pilot dataset:

```bash
cd apps/api
python scripts/import_historical_sales.py path/to/historical_sales.csv
```

Minimum CSV columns are `item_name`, `category`, and `sold_price`. Optional columns include `condition_label`, `currency`, `pickup_area`, `location`, `residential_college`, `sold_at`, `notes`, and `source_type`.

Frontend product pages:

- `/trade`
- `/trade/sell`
- `/trade/want`
- `/trade/[id]`
- `/wanted-posts/[id]`
- `/trade/dashboard`
- `/trade/moderation`

Internal quality pages remain available for release checks:

- `/trade/evaluation`

For local development, `CELERY_TASK_ALWAYS_EAGER=true` runs Celery tasks immediately inside the API process. Set it to `false` and run a worker when you want real background processing.

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

`GLM_PROVIDER=demo` keeps the offline deterministic local provider. Setting `GLM_PROVIDER=zai`, or providing `ZAI_API_KEY` for local backend runs, switches enrichment to the Z.AI provider. Change `ZAI_MODEL` to switch models later without code changes. `ZAI_BASE_URL` defaults to Z.AI's production endpoint: `https://api.z.ai/api/paas/v4`.

Connectivity check:

```bash
curl -H "Authorization: Bearer <admin-token>" http://localhost:8001/api/v1/ai/trade/test-glm
```

Provider status:

```bash
curl http://localhost:8001/api/v1/ai/trade/provider-status
```

Use `?live_check=true` when you explicitly want the endpoint to make a live provider call. The default response avoids spending quota and reports configured provider, model, deterministic fallback mode, and latest successful enrichment time if available.

Run GLM-backed enrichment:

```bash
curl -X POST http://localhost:8001/api/v1/ai/trade/enrich-listing/<listing_id>
curl http://localhost:8001/api/v1/ai/trade/result/<listing_id>
```

The SDK handles Bearer auth with the backend `ZAI_API_KEY`. Logs redact secrets and only record request status, model, and safe metadata. Multimodal image inputs must use public HTTPS URLs; localhost, plain HTTP, and private network image URLs are skipped and the decision pipeline continues with text-only analysis.

## Release Quality Controls

The quality layer compares UM Nexus Trade's AI-assisted decision engine against deliberately simple manual heuristics. It is a scenario-based release check until completed marketplace transactions provide enough live KPI data.

Quality cases represent common campus resale decisions:

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

The heuristic engine is intentionally simple:

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

The evaluation summary also reports launch quality metrics:

- AI overall score vs heuristic score
- pricing accuracy lift
- risky-listing detection lift
- action agreement lift
- match quality lift
- average time-to-sale proxy improvement
- estimated buyer search time saved

The time-to-sale metric is a transparent proxy derived from expected outcome text, action type, risk, price fit, and match availability. Treat it as a release-quality signal until the marketplace has enough completed transactions for live operational metrics.

Run the quality check from the API with an admin bearer token:

```bash
curl -H "Authorization: Bearer <admin-token>" -X POST http://localhost:8001/api/v1/ai/trade/evaluation/run
curl -H "Authorization: Bearer <admin-token>" http://localhost:8001/api/v1/ai/trade/evaluation/summary
```

Or open as an admin user:

- `http://localhost:3000/trade/evaluation`

This protects the product value proposition: if the GLM decision layer is removed, the system falls back to category averages and simple thresholds, losing multimodal condition reasoning, context-aware buyer matching, explainable action recommendations, and measurable decision-quality lift.

## Product Outcome Loop

The product now captures decision outcomes instead of stopping at recommendations:

- sellers can apply the suggested price or submit decision feedback
- sellers can test price trade-offs with the price simulation endpoint
- buyers can open wanted-post recommendations ranked by price, item, location, and risk fit
- contacting a strong match creates a transaction record
- completed transactions require an agreed price and whether the user followed the AI recommendation
- completed transaction prices are written back into `historical_sales` with `source_type=transaction`
- the dashboard reports accepted recommendations, decision feedback count, AI-followed completed sales, and average price adjustment

This creates the marketplace data flywheel required for launch: recommendations lead to actions, actions create outcomes, and outcomes improve future pricing evidence.

## Recommendation Engine

UM Nexus Trade uses a hybrid v1 recommendation engine for both seller and buyer workflows. The deterministic score is the ranking source of truth, while GLM enrichment can improve the surrounding decision wording when configured.

- Sellers see ranked potential buyers from `GET /api/v1/listings/{listing_id}/matches?limit=10&min_score=58`.
- Buyers see ranked product suggestions from `GET /api/v1/wanted-posts/{wanted_post_id}/recommended-listings?limit=12&min_score=58`.
- Scoring weights are buyer need fit `35%`, budget fit `25%`, location fit `25%`, urgency `10%`, and listing quality/freshness `5%`.
- Same normalized residential college is strongest. Values such as `KK12`, `kk 12`, and `Kolej Kediaman 12` all compare as `KK12`.
- Location scoring favors exact same KK, then exact pickup area, then generic KK-related proximity, then workable campus pickup points.
- Matches at `58+` are suggested; matches at `74+` are treated as strong recommendations. Buyer product suggestions below `58` are suppressed.

### Moderator Access

Moderation endpoints remain role-protected. For local setup, sign in with a UM-domain account and update that user profile to `app_role = moderator` or `admin` in the local database. Then open:

```text
http://localhost:3000/trade/moderation
```

The moderation page shows summary counts and human-readable risk cards instead of raw JSON.

### Supabase Storage Listing Images

Real listing uploads go through backend Supabase Storage using the service role key. Create a public Storage bucket, for example:

```env
SUPABASE_STORAGE_BUCKET=listing-images
```

The upload flow is:

1. `POST /api/v1/listings` creates the listing in the local product flow.
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
- `CORS_ALLOWED_ORIGINS`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_API_TIMEOUT_MS`
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
  { "service": "um-nexus-api", "status": "ok", "environment": "development" }
  ```

- `GET /health/ready` checks database connectivity and upload storage availability:

  ```json
  {
    "service": "um-nexus-api",
    "status": "ready",
    "checks": {
      "database": "ok",
      "storage": "ok",
      "glm_provider": "demo"
    }
  }
  ```

- The web homepage renders the Trade Intelligence product entry point:

  ```text
  UM Nexus Trade Intelligence
  ```

- `GET /api/v1/auth/me` returns the synced local user/profile when called with a valid Supabase bearer token

## Product Readiness Checks

Run these before releases or deployment:

```bash
cd apps/web
npm run lint
npm run build
npm audit --audit-level=moderate

cd ../api
.venv\Scripts\python.exe -m pytest
```

The web container now builds a production Next.js app with `npm ci`, build-time public environment args, and `next start`. Keep public frontend values in `.env` or your deployment environment; do not bake local `.env.local` into the image.

## Useful Commands

- `make up` to build and start the stack
- `make down` to stop the stack
- `make logs` to tail compose logs
- `make api-dev` to run FastAPI locally
- `make web-dev` to run Next.js locally
