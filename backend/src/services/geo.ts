import { randomUUID } from "node:crypto";

import { Prisma, type RescueRole, type ResponderStatus, type Symptom, type Tier } from "@prisma/client";

import { prisma } from "../db/client.js";
import type { AedDeviceSummary, ResponderSummary, SosDetail } from "../types.js";
import { AppError } from "../middleware/error.js";

type NearbyUser = {
  id: string;
  email: string;
  displayName: string;
  currentTier: Tier | null;
  notificationRadiusM: number;
  expoPushToken: string | null;
  lat: number;
  lng: number;
  distanceM: number;
};

type RawAedRow = {
  id: string;
  externalId: string;
  name: string;
  lat: number;
  lng: number;
  distanceM: number;
  address: string | null;
  hours: string | null;
  indoor: boolean | null;
  manufacturer: string | null;
  model: string | null;
  installedAt: string | null;
  sourceLicense: string;
};

type RawSosRow = {
  id: string;
  finderId: string;
  symptom: Symptom;
  lat: number;
  lng: number;
  locationLabel: string | null;
  status: string;
  isDemo: boolean;
  createdAt: Date;
};

type RawSessionTargetRow = {
  sessionId: string;
  state: string;
  dispatchRound: number;
  isDemo: boolean;
  finderId: string;
  finderPushToken: string | null;
  locationLabel: string | null;
  symptom: Symptom;
  targetLat: number;
  targetLng: number;
};

type RawResponderRow = {
  id: string;
  userId: string;
  role: RescueRole;
  status: ResponderStatus;
  etaSec: number | null;
  lat: number | null;
  lng: number | null;
  acceptedAt: Date | null;
  arrivedAt: Date | null;
  tier: Tier | null;
  displayName: string;
};

export const pointSql = (lat: number, lng: number) =>
  Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;

const toAedSummary = (row: RawAedRow): AedDeviceSummary => ({
  id: row.id,
  externalId: row.externalId,
  name: row.name,
  lat: Number(row.lat),
  lng: Number(row.lng),
  distanceM: Number(row.distanceM),
  address: row.address,
  hours: row.hours,
  indoor: row.indoor ?? true,
  manufacturer: row.manufacturer,
  model: row.model,
  installedAt: row.installedAt,
  sourceLicense: row.sourceLicense,
});

export const haversineMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusM = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(a));
};

export const updateUserLastKnownLocation = async (
  userId: string,
  lat: number,
  lng: number,
): Promise<void> => {
  await prisma.$executeRaw`
    UPDATE "User"
    SET "lastKnownGeom" = ${pointSql(lat, lng)}
    WHERE "id" = ${userId}
  `;
};

export const insertSosWithGeom = async (input: {
  id: string;
  finderId: string;
  symptom: Symptom;
  lat: number;
  lng: number;
  accuracyM?: number;
  locationLabel?: string;
  isDemo: boolean;
}): Promise<void> => {
  await prisma.$executeRaw`
    INSERT INTO "Sos" (
      "id",
      "finderId",
      "symptom",
      "locationLabel",
      "geom",
      "accuracyM",
      "status",
      "isDemo",
      "createdAt"
    ) VALUES (
      ${input.id},
      ${input.finderId},
      ${input.symptom}::"Symptom",
      ${input.locationLabel ?? null},
      ${pointSql(input.lat, input.lng)},
      ${input.accuracyM ?? null},
      'ACTIVE'::"SosStatus",
      ${input.isDemo},
      NOW()
    )
  `;
};

export const updateResponderGeom = async (input: {
  responderId: string;
  column: "notifiedGeom" | "currentGeom";
  lat: number;
  lng: number;
  etaSec?: number;
}): Promise<void> => {
  const column = Prisma.raw(`"${input.column}"`);
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Responder"
    SET
      ${column} = ${pointSql(input.lat, input.lng)},
      "etaSec" = ${input.etaSec ?? null},
      "lastPingedAt" = NOW()
    WHERE "id" = ${input.responderId}
  `);
};

export const clearResponderGeometries = async (sessionId: string): Promise<void> => {
  await prisma.$executeRaw`
    UPDATE "Responder"
    SET "currentGeom" = NULL, "notifiedGeom" = NULL
    WHERE "sessionId" = ${sessionId}
  `;
};

export const findNearbyAeds = async (
  lat: number,
  lng: number,
  radiusM: number,
  limit: number,
): Promise<AedDeviceSummary[]> => {
  const rows = await prisma.$queryRaw<RawAedRow[]>(Prisma.sql`
    SELECT
      a."id",
      a."externalId",
      a."name",
      ST_Y(a."geom"::geometry) AS "lat",
      ST_X(a."geom"::geometry) AS "lng",
      ST_Distance(a."geom", ${pointSql(lat, lng)}) AS "distanceM",
      a."address",
      a."hours",
      a."indoor",
      a."manufacturer",
      a."model",
      a."installedAt",
      a."sourceLicense"
    FROM "AedDevice" a
    WHERE ST_DWithin(a."geom", ${pointSql(lat, lng)}, ${radiusM})
    ORDER BY ST_Distance(a."geom", ${pointSql(lat, lng)})
    LIMIT ${limit}
  `);

  return rows.map(toAedSummary);
};

export const findNearestAed = async (
  lat: number,
  lng: number,
  radiusM = 5_000,
): Promise<AedDeviceSummary | null> => {
  const [aed] = await findNearbyAeds(lat, lng, radiusM, 1);
  return aed ?? null;
};

export const findNearbyUsers = async (input: {
  lat: number;
  lng: number;
  radiusM: number;
  finderId: string;
  tiers: Tier[];
  excludeUserIds?: string[];
}): Promise<NearbyUser[]> => {
  if (input.tiers.length === 0) {
    return [];
  }

  const excluded = [...(input.excludeUserIds ?? []), input.finderId];
  const excludeClause =
    excluded.length > 0
      ? Prisma.sql`AND u."id" NOT IN (${Prisma.join(excluded)})`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<NearbyUser[]>(Prisma.sql`
    SELECT
      u."id",
      u."email",
      u."displayName",
      u."currentTier",
      u."notificationRadiusM",
      u."expoPushToken",
      ST_Y(u."lastKnownGeom"::geometry) AS "lat",
      ST_X(u."lastKnownGeom"::geometry) AS "lng",
      ST_Distance(u."lastKnownGeom", ${pointSql(input.lat, input.lng)}) AS "distanceM"
    FROM "User" u
    WHERE u."notificationOptIn" = true
      AND u."expoPushToken" IS NOT NULL
      AND u."currentTier" IN (${Prisma.join(input.tiers.map((tier) => Prisma.sql`${tier}::"Tier"`))})
      AND u."lastKnownGeom" IS NOT NULL
      AND ST_DWithin(
        u."lastKnownGeom",
        ${pointSql(input.lat, input.lng)},
        LEAST(${input.radiusM}, u."notificationRadiusM")
      )
      ${excludeClause}
    ORDER BY ST_Distance(u."lastKnownGeom", ${pointSql(input.lat, input.lng)})
  `);

  return rows;
};

export const getSosRaw = async (sosId: string): Promise<RawSosRow> => {
  const rows = await prisma.$queryRaw<RawSosRow[]>(Prisma.sql`
    SELECT
      s."id",
      s."finderId",
      s."symptom",
      ST_Y(s."geom"::geometry) AS "lat",
      ST_X(s."geom"::geometry) AS "lng",
      s."locationLabel",
      s."status",
      s."isDemo",
      s."createdAt"
    FROM "Sos" s
    WHERE s."id" = ${sosId}
    LIMIT 1
  `);

  const row = rows[0];
  if (!row) {
    throw new AppError(404, "NOT_FOUND", "SOS not found");
  }
  return row;
};

export const getSessionTarget = async (sessionId: string): Promise<RawSessionTargetRow> => {
  const rows = await prisma.$queryRaw<RawSessionTargetRow[]>(Prisma.sql`
    SELECT
      rs."id" AS "sessionId",
      rs."state",
      rs."dispatchRound",
      rs."isDemo",
      s."finderId",
      u."expoPushToken" AS "finderPushToken",
      s."locationLabel",
      s."symptom",
      ST_Y(s."geom"::geometry) AS "targetLat",
      ST_X(s."geom"::geometry) AS "targetLng"
    FROM "RescueSession" rs
    INNER JOIN "Sos" s ON s."id" = rs."sosId"
    INNER JOIN "User" u ON u."id" = s."finderId"
    WHERE rs."id" = ${sessionId}
    LIMIT 1
  `);

  const row = rows[0];
  if (!row) {
    throw new AppError(404, "NOT_FOUND", "Rescue session not found");
  }
  return row;
};

export const getResponderSummaries = async (sessionId: string): Promise<ResponderSummary[]> => {
  const rows = await prisma.$queryRaw<RawResponderRow[]>(Prisma.sql`
    SELECT
      r."id",
      r."userId",
      r."role",
      r."status",
      r."etaSec",
      CASE WHEN r."currentGeom" IS NULL THEN NULL ELSE ST_Y(r."currentGeom"::geometry) END AS "lat",
      CASE WHEN r."currentGeom" IS NULL THEN NULL ELSE ST_X(r."currentGeom"::geometry) END AS "lng",
      r."acceptedAt",
      r."arrivedAt",
      u."currentTier" AS "tier",
      u."displayName"
    FROM "Responder" r
    INNER JOIN "User" u ON u."id" = r."userId"
    WHERE r."sessionId" = ${sessionId}
    ORDER BY r."notifiedAt" ASC
  `);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    role: row.role,
    status: row.status,
    etaSec: row.etaSec,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    arrivedAt: row.arrivedAt?.toISOString() ?? null,
    tier: row.tier,
    displayName: row.displayName,
  }));
};

export const getSosDetail = async (sosId: string): Promise<SosDetail> => {
  const sos = await getSosRaw(sosId);
  const session = await prisma.rescueSession.findUnique({
    where: { sosId },
    select: {
      id: true,
      state: true,
      dispatchRound: true,
      aedDeviceId: true,
    },
  });

  if (!session) {
    throw new AppError(404, "NOT_FOUND", "Rescue session not found");
  }

  const responders = await getResponderSummaries(session.id);
  const aedDevice = session.aedDeviceId
    ? await findAedById(session.aedDeviceId)
    : null;

  return {
    sos: {
      id: sos.id,
      finderId: sos.finderId,
      symptom: sos.symptom,
      lat: Number(sos.lat),
      lng: Number(sos.lng),
      locationLabel: sos.locationLabel,
      status: sos.status as SosDetail["sos"]["status"],
      isDemo: sos.isDemo,
      createdAt: sos.createdAt.toISOString(),
    },
    session: {
      id: session.id,
      state: session.state,
      dispatchRound: session.dispatchRound,
      aedDevice,
      responders,
    },
  };
};

export const findAedById = async (aedId: string): Promise<AedDeviceSummary | null> => {
  const rows = await prisma.$queryRaw<RawAedRow[]>(Prisma.sql`
    SELECT
      a."id",
      a."externalId",
      a."name",
      ST_Y(a."geom"::geometry) AS "lat",
      ST_X(a."geom"::geometry) AS "lng",
      0::double precision AS "distanceM",
      a."address",
      a."hours",
      a."indoor",
      a."manufacturer",
      a."model",
      a."installedAt",
      a."sourceLicense"
    FROM "AedDevice" a
    WHERE a."id" = ${aedId}
    LIMIT 1
  `);

  const row = rows[0];
  return row ? toAedSummary(row) : null;
};

export const upsertAedDevice = async (input: {
  externalId: string;
  name: string;
  manufacturer?: string;
  model?: string;
  installedAt?: string;
  address?: string;
  hours?: string;
  indoor?: boolean;
  lat: number;
  lng: number;
}): Promise<void> => {
  const generatedId = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "AedDevice" (
      "id",
      "externalId",
      "name",
      "manufacturer",
      "model",
      "installedAt",
      "address",
      "hours",
      "indoor",
      "geom",
      "sourceLicense",
      "importedAt",
      "updatedAt"
    )
    VALUES (
      ${generatedId},
      ${input.externalId},
      ${input.name},
      ${input.manufacturer ?? null},
      ${input.model ?? null},
      ${input.installedAt ?? null},
      ${input.address ?? null},
      ${input.hours ?? null},
      ${input.indoor ?? true},
      ${pointSql(input.lat, input.lng)},
      'AED N@VI / CC BY 3.0',
      NOW(),
      NOW()
    )
    ON CONFLICT ("externalId") DO UPDATE SET
      "name" = EXCLUDED."name",
      "manufacturer" = EXCLUDED."manufacturer",
      "model" = EXCLUDED."model",
      "installedAt" = EXCLUDED."installedAt",
      "address" = EXCLUDED."address",
      "hours" = EXCLUDED."hours",
      "indoor" = EXCLUDED."indoor",
      "geom" = EXCLUDED."geom",
      "updatedAt" = NOW()
  `;
};
