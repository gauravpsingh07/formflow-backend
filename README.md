# FormFlow Backend

NestJS backend for FormFlow, a full-stack form builder and response analytics product.

## Overview

This service handles:

- JWT-based authentication
- form CRUD and field management
- publish / unpublish workflows
- public form fetching and submission
- response listing and detail views
- analytics aggregation
- webhook endpoint management and delivery logging

## Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Redis via Docker Compose
- Jest

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start local services

Make sure Docker Desktop is open and fully running first.

```bash
docker compose up -d
```

This starts:

- Postgres on `localhost:5432`
- Redis on `localhost:6379`

### 3. Environment

The repo already includes a local `.env` file for development.

Current required values:

```env
DATABASE_URL="postgresql://formflow:formflow@localhost:5432/formflow?schema=public"
JWT_ACCESS_SECRET=dev_access_secret_change_me
JWT_ACCESS_TTL_SECONDS=900
```

### 4. Apply migrations

```bash
npx prisma migrate deploy
```

If you change the Prisma schema later, regenerate the client with:

```bash
npx prisma generate
```

### 5. Start the server

```bash
npm run start:dev
```

The API runs on:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/health
```

## Core API Areas

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

## Useful Commands

### Development

```bash
npm run start:dev
```

### Build

```bash
npm run build
```

### Tests

```bash
npm test -- --runInBand
```

## Kubernetes Secrets

Real Kubernetes secrets are not stored in this repository.

Files in `k8s/` now follow this rule:

- `k8s/secret.example.yaml` is a safe template only
- `k8s/secret.yaml` contains placeholders only and must be replaced before use
- local secret manifests such as `k8s/secret.local.yaml` should stay untracked

Recommended approach for local Kubernetes:

```bash
kubectl -n formflow create secret generic formflow-backend-secrets \
  --from-literal=DATABASE_URL="postgresql://<db-user>:<db-password>@<db-host>:5432/<db-name>?schema=public" \
  --from-literal=REDIS_URL="redis://<redis-host>:6379" \
  --from-literal=JWT_ACCESS_SECRET="<generate-a-long-random-secret>"
```

If you previously committed real credentials, rotate them immediately:

- database password / connection string
- Redis credentials if applicable
- JWT signing secret

## Local Testing Flow

1. Start Docker Desktop.
2. Run `docker compose up -d`.
3. Run `npx prisma migrate deploy`.
4. Run `npm run start:dev`.
5. Start the frontend app.
6. Register a user from the frontend.
7. Create a form, add fields, publish it, and submit public responses.
8. Verify responses, analytics, and webhook deliveries.

## Notes

- If auth returns a `500`, the most common cause is Postgres not running.
- If `docker compose up -d` fails with a `dockerDesktopLinuxEngine` pipe error, Docker Desktop is not ready yet.
- Webhook retry support is implemented at the API layer; for local use, trigger it through the internal job endpoint.
- Treat any secret ever committed to git as compromised and rotate it before reuse.
