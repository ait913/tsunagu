CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "Tier" AS ENUM ('TIER1', 'TIER2', 'TIER3');
CREATE TYPE "TierAppStatus" AS ENUM ('PENDING', 'REVIEWING', 'APPROVED', 'REJECTED');
CREATE TYPE "Symptom" AS ENUM ('NO_BREATHING', 'NO_CONSCIOUSNESS', 'BLEEDING', 'OTHER');
CREATE TYPE "SosStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'ENDED');
CREATE TYPE "RescueRole" AS ENUM ('RESPONDER', 'AED_CARRIER');
CREATE TYPE "ResponderStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'ENROUTE', 'ARRIVED', 'HANDED_OFF', 'CANCELLED');
CREATE TYPE "HandoffKind" AS ENUM ('RESPONDER_TO_RESPONDER', 'AED_DELIVERED', 'TO_EMS');
CREATE TYPE "AuditAction" AS ENUM (
  'USER_REGISTERED',
  'USER_LOGGED_IN',
  'TIER_APPLIED',
  'TIER_APPROVED',
  'TIER_REJECTED',
  'SOS_FIRED',
  'SOS_CANCELLED',
  'RESPONDER_NOTIFIED',
  'RESPONDER_ACCEPTED',
  'RESPONDER_DECLINED',
  'RESPONDER_ARRIVED',
  'HANDOFF_RECORDED',
  'RESCUE_ENDED',
  'CONSENT_RECORDED'
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "phone" TEXT,
  "currentTier" "Tier",
  "notificationOptIn" BOOLEAN NOT NULL DEFAULT true,
  "notificationRadiusM" INTEGER NOT NULL DEFAULT 400,
  "expoPushToken" TEXT,
  "agreedTermsVersion" INTEGER,
  "finderOnlyMode" BOOLEAN NOT NULL DEFAULT false,
  "demoEnabled" BOOLEAN NOT NULL DEFAULT false,
  "lastKnownGeom" geography(Point, 4326),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TierApplication" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestedTier" "Tier" NOT NULL,
  "status" "TierAppStatus" NOT NULL DEFAULT 'PENDING',
  "documentKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "note" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewerNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TierApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Sos" (
  "id" TEXT NOT NULL,
  "finderId" TEXT NOT NULL,
  "symptom" "Symptom" NOT NULL,
  "locationLabel" TEXT,
  "geom" geography(Point, 4326) NOT NULL,
  "accuracyM" DOUBLE PRECISION,
  "status" "SosStatus" NOT NULL DEFAULT 'ACTIVE',
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "Sos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AedDevice" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "manufacturer" TEXT,
  "model" TEXT,
  "installedAt" TEXT,
  "address" TEXT,
  "hours" TEXT,
  "indoor" BOOLEAN DEFAULT true,
  "geom" geography(Point, 4326) NOT NULL,
  "sourceLicense" TEXT NOT NULL DEFAULT 'AED N@VI / CC BY 3.0',
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AedDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RescueSession" (
  "id" TEXT NOT NULL,
  "sosId" TEXT NOT NULL,
  "aedDeviceId" TEXT,
  "dispatchRound" INTEGER NOT NULL DEFAULT 0,
  "state" TEXT NOT NULL DEFAULT 'PENDING',
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "RescueSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Responder" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "RescueRole" NOT NULL,
  "status" "ResponderStatus" NOT NULL DEFAULT 'ASSIGNED',
  "notifiedGeom" geography(Point, 4326),
  "currentGeom" geography(Point, 4326),
  "lastPingedAt" TIMESTAMP(3),
  "etaSec" INTEGER,
  "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "arrivedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "Responder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HandoffEvent" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "kind" "HandoffKind" NOT NULL,
  "fromUserId" TEXT,
  "toUserId" TEXT,
  "aedDeviceId" TEXT,
  "note" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HandoffEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsentLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "layer" TEXT NOT NULL,
  "termsVersion" INTEGER NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" "AuditAction" NOT NULL,
  "resourceId" TEXT,
  "resourceType" TEXT,
  "payload" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "AedDevice_externalId_key" ON "AedDevice"("externalId");
CREATE UNIQUE INDEX "RescueSession_sosId_key" ON "RescueSession"("sosId");
CREATE UNIQUE INDEX "Responder_sessionId_userId_role_key" ON "Responder"("sessionId", "userId", "role");

CREATE INDEX "User_currentTier_idx" ON "User"("currentTier");
CREATE INDEX "User_notificationOptIn_idx" ON "User"("notificationOptIn");
CREATE INDEX "TierApplication_userId_idx" ON "TierApplication"("userId");
CREATE INDEX "TierApplication_status_idx" ON "TierApplication"("status");
CREATE INDEX "Sos_status_idx" ON "Sos"("status");
CREATE INDEX "Sos_finderId_idx" ON "Sos"("finderId");
CREATE INDEX "Sos_createdAt_idx" ON "Sos"("createdAt");
CREATE INDEX "RescueSession_state_idx" ON "RescueSession"("state");
CREATE INDEX "RescueSession_sosId_idx" ON "RescueSession"("sosId");
CREATE INDEX "Responder_sessionId_role_idx" ON "Responder"("sessionId", "role");
CREATE INDEX "Responder_userId_idx" ON "Responder"("userId");
CREATE INDEX "Responder_status_idx" ON "Responder"("status");
CREATE INDEX "AedDevice_externalId_idx" ON "AedDevice"("externalId");
CREATE INDEX "HandoffEvent_sessionId_idx" ON "HandoffEvent"("sessionId");
CREATE INDEX "HandoffEvent_occurredAt_idx" ON "HandoffEvent"("occurredAt");
CREATE INDEX "ConsentLog_userId_idx" ON "ConsentLog"("userId");
CREATE INDEX "ConsentLog_termsVersion_idx" ON "ConsentLog"("termsVersion");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_resourceId_idx" ON "AuditLog"("resourceId");

CREATE INDEX sos_geom_gist ON "Sos" USING GIST ("geom");
CREATE INDEX aed_geom_gist ON "AedDevice" USING GIST ("geom");
CREATE INDEX responder_curr_gist ON "Responder" USING GIST ("currentGeom");
CREATE INDEX responder_notif_gist ON "Responder" USING GIST ("notifiedGeom");
CREATE INDEX user_last_known_geom_gist ON "User" USING GIST ("lastKnownGeom");

ALTER TABLE "TierApplication"
  ADD CONSTRAINT "TierApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Sos"
  ADD CONSTRAINT "Sos_finderId_fkey"
  FOREIGN KEY ("finderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RescueSession"
  ADD CONSTRAINT "RescueSession_sosId_fkey"
  FOREIGN KEY ("sosId") REFERENCES "Sos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RescueSession"
  ADD CONSTRAINT "RescueSession_aedDeviceId_fkey"
  FOREIGN KEY ("aedDeviceId") REFERENCES "AedDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Responder"
  ADD CONSTRAINT "Responder_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "RescueSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Responder"
  ADD CONSTRAINT "Responder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HandoffEvent"
  ADD CONSTRAINT "HandoffEvent_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "RescueSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HandoffEvent"
  ADD CONSTRAINT "HandoffEvent_fromUserId_fkey"
  FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HandoffEvent"
  ADD CONSTRAINT "HandoffEvent_toUserId_fkey"
  FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConsentLog"
  ADD CONSTRAINT "ConsentLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
