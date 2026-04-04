-- Add optional response duration tracking for analytics
ALTER TABLE "FormResponse"
ADD COLUMN "durationMs" INTEGER;

-- Create enums for webhook support
CREATE TYPE "WebhookEventType" AS ENUM (
  'RESPONSE_CREATED',
  'FORM_PUBLISHED',
  'FORM_UNPUBLISHED'
);

CREATE TYPE "WebhookDeliveryStatus" AS ENUM (
  'PENDING',
  'SUCCESS',
  'FAILED'
);

-- Webhook endpoint registry
CREATE TABLE "WebhookEndpoint" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "events" "WebhookEventType"[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- Delivery log and retry state
CREATE TABLE "WebhookDelivery" (
  "id" TEXT NOT NULL,
  "endpointId" TEXT NOT NULL,
  "eventType" "WebhookEventType" NOT NULL,
  "payload" JSONB NOT NULL,
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "statusCode" INTEGER,
  "lastError" TEXT,
  "nextRetryAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookEndpoint_ownerId_idx" ON "WebhookEndpoint"("ownerId");
CREATE INDEX "WebhookDelivery_endpointId_createdAt_idx" ON "WebhookDelivery"("endpointId", "createdAt");
CREATE INDEX "WebhookDelivery_status_nextRetryAt_idx" ON "WebhookDelivery"("status", "nextRetryAt");

ALTER TABLE "WebhookEndpoint"
ADD CONSTRAINT "WebhookEndpoint_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebhookDelivery"
ADD CONSTRAINT "WebhookDelivery_endpointId_fkey"
FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
