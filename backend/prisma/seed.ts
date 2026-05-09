import { existsSync } from "node:fs";

import { Tier } from "@prisma/client";

import { prisma } from "../src/db/client.js";
import { env } from "../src/env.js";
import { updateUserLastKnownLocation } from "../src/services/geo.js";
import { hashPassword } from "../src/services/password.js";
import { importAedNaviCsv } from "../src/services/aedNaviImporter.js";

const seedPassword = "Password123";

const seedUsers: Array<{
  email: string;
  displayName: string;
  currentTier: Tier | null;
  finderOnlyMode?: boolean;
  lat: number;
  lng: number;
}> = [
  {
    email: "finder@tsunagu.local",
    displayName: "Finder Demo",
    currentTier: null,
    finderOnlyMode: true,
    lat: 35.681236,
    lng: 139.767125,
  },
  {
    email: "tier1@tsunagu.local",
    displayName: "Tier1 Demo",
    currentTier: "TIER1",
    lat: 35.6818,
    lng: 139.7667,
  },
  {
    email: "tier2@tsunagu.local",
    displayName: "Tier2 Demo",
    currentTier: "TIER2",
    lat: 35.6809,
    lng: 139.7681,
  },
  {
    email: "tier3@tsunagu.local",
    displayName: "Tier3 Demo",
    currentTier: "TIER3",
    lat: 35.682,
    lng: 139.7692,
  },
  {
    email: env.ADMIN_EMAILS[0] ?? "admin@tsunagu.local",
    displayName: "Admin Demo",
    currentTier: "TIER1",
    lat: 35.6802,
    lng: 139.7659,
  },
];

const ensureTierHistory = async (userId: string, requestedTier: Tier | null): Promise<void> => {
  if (!requestedTier) {
    return;
  }
  const existing = await prisma.tierApplication.findFirst({
    where: {
      userId,
      requestedTier,
      status: "APPROVED",
    },
  });
  if (!existing) {
    await prisma.tierApplication.create({
      data: {
        userId,
        requestedTier,
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: "seed",
        reviewerNote: "Seeded approval",
        documentKeys: [],
      },
    });
  }
};

const main = async (): Promise<void> => {
  const passwordHash = await hashPassword(seedPassword);

  for (const seedUser of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        displayName: seedUser.displayName,
        passwordHash,
        currentTier: seedUser.currentTier,
        finderOnlyMode: seedUser.finderOnlyMode ?? false,
        agreedTermsVersion: 1,
      },
      create: {
        email: seedUser.email,
        displayName: seedUser.displayName,
        passwordHash,
        currentTier: seedUser.currentTier,
        finderOnlyMode: seedUser.finderOnlyMode ?? false,
        agreedTermsVersion: 1,
      },
    });

    await ensureTierHistory(user.id, seedUser.currentTier);
    await updateUserLastKnownLocation(user.id, seedUser.lat, seedUser.lng);
  }

  if (existsSync(env.AED_NAVI_CSV_PATH)) {
    const result = await importAedNaviCsv(env.AED_NAVI_CSV_PATH);
    console.log("AED CSV import complete", result);
  } else {
    console.warn(`AED CSV not found at ${env.AED_NAVI_CSV_PATH}; skipping import`);
  }

  console.log("Seed complete");
  console.log(`Demo password for seeded users: ${seedPassword}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
