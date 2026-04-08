# FormFlow Backend

![CI](https://github.com/gauravpsingh07/formflow-backend/actions/workflows/ci.yml/badge.svg)
![Coverage](./docs/badges/coverage.svg)

NestJS backend for FormFlow, a full-stack form builder with authentication, form CRUD, public submissions, analytics, and webhook delivery tracking.

## Project Overview

This service handles:

- JWT-based authentication
- form CRUD, field management, and publish / unpublish workflows
- public form fetching and submission
- response listing, response detail views, and analytics aggregation
- webhook endpoint management, delivery logging, and retry jobs

## Prerequisites

- Node.js 20
- npm
- Docker Desktop

## Getting Started

### 1. Install dependencies

```bash
npm ci
```

### 2. Create your local environment file

```bash
cp .env.example .env
```

Required values:

```env
DATABASE_URL="postgresql://formflow:formflow@localhost:5432/formflow?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="replace-me-with-a-long-random-secret"
JWT_ACCESS_TTL_SECONDS=900
INTERNAL_JOB_SECRET="replace-me-with-an-internal-job-secret"
```

### 3. Start the local stack

For a full frontend + backend demo, run this from the parent `formflow/` workspace:

```bash
docker compose up --build
```

If you only need backend infrastructure locally, this repo still includes a smaller compose file:

```bash
docker compose up -d
```

### 4. Apply database migrations

```bash
npm run migrate
```

### 5. Start the API in development

```bash
npm run dev
```

The API runs on `http://localhost:3000`, and the health check is available at `http://localhost:3000/health`.

## Scripts

- `npm run dev` starts the Nest dev server
- `npm run build` creates a production build
- `npm run start:prod` runs the compiled server
- `npm run lint` checks TypeScript source with ESLint
- `npm run lint:fix` applies lint fixes
- `npm run test` runs the Jest suite
- `npm run test:cov` runs tests with coverage output
- `npm run test:e2e` runs e2e coverage checks
- `npm run migrate` applies Prisma migrations
- `npm run badge:coverage` regenerates the checked-in coverage badge

## API Endpoints

### Auth

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `GET /v1/auth/me`

### Forms

- `GET /v1/forms`
- `POST /v1/forms`
- `GET /v1/forms/:id`
- `PATCH /v1/forms/:id`
- `DELETE /v1/forms/:id`
- `POST /v1/forms/:id/publish`
- `POST /v1/forms/:id/unpublish`

### Fields

- `GET /v1/forms/:formId/fields`
- `POST /v1/forms/:formId/fields`
- `PATCH /v1/forms/:formId/fields/:fieldId`
- `DELETE /v1/forms/:formId/fields/:fieldId`
- `POST /v1/forms/:formId/fields/reorder`

### Public Forms

- `GET /public/forms/:slug`
- `POST /public/forms/:slug/submit`

### Responses and Analytics

- `GET /v1/forms/:formId/responses`
- `GET /v1/forms/:formId/responses/:responseId`
- `GET /v1/forms/:formId/analytics`

### Webhooks

- `POST /v1/webhooks`
- `GET /v1/webhooks`
- `PATCH /v1/webhooks/:id`
- `DELETE /v1/webhooks/:id`
- `GET /v1/webhooks/:id/deliveries`
- `POST /v1/webhooks/:id/test`
- `POST /internal/jobs/webhooks/retry`

## Tests

The automated suite covers:

- auth registration and login behavior
- form creation and publish rules
- webhook retry handling
- request validation for `POST /v1/forms`
- health route availability

Run the suite with:

```bash
npm run test:cov -- --runInBand
```

## OpenAPI

The current backend does not yet publish a Swagger UI. The README keeps the route inventory explicit so the public API surface remains documented while the Nest module stays dependency-light.

## CI

GitHub Actions runs Node 20 on every push and pull request, then executes:

- `npm ci`
- `npm run lint`
- `npm run test:cov -- --runInBand`
- `npm run build`

## Kubernetes Secrets

Real Kubernetes secrets are not stored in this repository.

- `k8s/secret.yaml` has been removed from source control
- `k8s/secret.example.yaml` contains placeholders only
- local secret manifests such as `k8s/secret.local.yaml` should stay untracked

Recommended approach for local Kubernetes:

```bash
kubectl -n formflow create secret generic formflow-backend-secrets \
  --from-literal=DATABASE_URL="postgresql://<db-user>:<db-password>@<db-host>:5432/<db-name>?schema=public" \
  --from-literal=REDIS_URL="redis://<redis-host>:6379" \
  --from-literal=JWT_ACCESS_SECRET="<generate-a-long-random-secret>"
```

## Security

- tracked env files and committed secret manifests were removed from the repo
- all credentials that were previously committed should be treated as compromised and rotated
- this repo now ships only placeholder examples in `.env.example` and `k8s/secret.example.yaml`
- no real application secrets belong in git history or pull requests

## License

UNLICENSED
