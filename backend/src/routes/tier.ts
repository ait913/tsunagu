import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";

import { prisma } from "../db/client.js";
import { isAdminEmail } from "../env.js";
import { setAuditEntry } from "../middleware/audit.js";
import { getAuthUser, requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { buildTierDocumentKey, getSignedDownloadUrl, uploadBufferToS3 } from "../services/s3.js";
import type { AppBindings } from "../types.js";
import { parseWithSchema } from "../validation.js";

const router = new Hono<AppBindings>();

const applySchema = z.object({
  requestedTier: z.enum(["TIER1", "TIER2", "TIER3"]),
  note: z.string().trim().max(1_000).optional(),
});

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const maxFileSizeBytes = 5 * 1024 * 1024;

const extractFiles = (value: unknown): File[] => {
  if (!value) {
    return [];
  }
  const items = Array.isArray(value) ? value : [value];
  return items.filter((item): item is File => item instanceof File);
};

const documentHandler = async (c: Context<AppBindings>) => {
  const user = getAuthUser(c);
  const basePath = "/tier/document/";
  const key = decodeURIComponent(c.req.path.slice(c.req.path.indexOf(basePath) + basePath.length));

  const application = await prisma.tierApplication.findFirst({
    where: { documentKeys: { has: key } },
    select: { userId: true },
  });
  if (!application) {
    throw new AppError(404, "NOT_FOUND", "Document not found");
  }

  if (application.userId !== user.id && !isAdminEmail(user.email)) {
    throw new AppError(403, "FORBIDDEN", "Document access denied");
  }

  return c.redirect(await getSignedDownloadUrl(key), 302);
};

router.post("/apply", requireAuth, async (c) => {
  const user = getAuthUser(c);
  const body = await c.req.parseBody({ all: true });
  const input = parseWithSchema(applySchema, {
    requestedTier: body.requestedTier,
    note: typeof body.note === "string" ? body.note : undefined,
  });
  const documents = extractFiles(body.documents ?? body["documents[]"]);

  if (documents.length < 1 || documents.length > 5) {
    throw new AppError(400, "VALIDATION", "Tier application requires 1 to 5 documents");
  }

  for (const document of documents) {
    if (document.size > maxFileSizeBytes) {
      throw new AppError(400, "VALIDATION", "File too large", { name: document.name });
    }
    if (!allowedMimeTypes.has(document.type)) {
      throw new AppError(415, "UNSUPPORTED_MEDIA", "Unsupported document media type", {
        name: document.name,
        type: document.type,
      });
    }
  }

  const existing = await prisma.tierApplication.findFirst({
    where: {
      userId: user.id,
      requestedTier: input.requestedTier,
      status: { in: ["PENDING", "REVIEWING"] },
    },
  });
  if (existing) {
    throw new AppError(409, "ALREADY_PENDING", "Tier application already pending");
  }

  const application = await prisma.tierApplication.create({
    data: {
      userId: user.id,
      requestedTier: input.requestedTier,
      note: input.note,
      documentKeys: [],
    },
    select: {
      id: true,
      requestedTier: true,
      status: true,
      createdAt: true,
    },
  });

  const documentKeys: string[] = [];
  for (const [index, document] of documents.entries()) {
    const key = buildTierDocumentKey(user.id, application.id, document.name, index);
    const buffer = Buffer.from(await document.arrayBuffer());
    await uploadBufferToS3(key, buffer, document.type);
    documentKeys.push(key);
  }

  await prisma.tierApplication.update({
    where: { id: application.id },
    data: { documentKeys },
  });

  setAuditEntry(c, {
    action: "TIER_APPLIED",
    resourceId: application.id,
    resourceType: "TierApplication",
  });

  return c.json(
    {
      application: {
        ...application,
        documentKeys,
        createdAt: application.createdAt.toISOString(),
      },
    },
    201,
  );
});

router.get("/status", requireAuth, async (c) => {
  const user = getAuthUser(c);
  const [currentUser, pendingApplication, history] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { currentTier: true },
    }),
    prisma.tierApplication.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "REVIEWING"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        requestedTier: true,
        status: true,
        createdAt: true,
        reviewerNote: true,
      },
    }),
    prisma.tierApplication.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        requestedTier: true,
        status: true,
        reviewedAt: true,
      },
    }),
  ]);

  return c.json({
    currentTier: currentUser?.currentTier ?? null,
    pendingApplication: pendingApplication
      ? {
          ...pendingApplication,
          createdAt: pendingApplication.createdAt.toISOString(),
        }
      : null,
    history: history.map((item) => ({
      ...item,
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
    })),
  });
});

router.get("/document/:key", requireAuth, documentHandler);
router.get("/document/*", requireAuth, documentHandler);

export default router;
