import { Hono } from "hono";
import { z } from "zod";

import { prisma } from "../db/client.js";
import { setAuditEntry } from "../middleware/audit.js";
import { getAuthUser, requireAdmin, requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { sendMail } from "../services/mailer.js";
import type { AppBindings } from "../types.js";
import { parseWithSchema } from "../validation.js";

const router = new Hono<AppBindings>();

const listQuerySchema = z.object({
  status: z.enum(["PENDING", "REVIEWING", "APPROVED", "REJECTED"]).optional(),
});

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewerNote: z.string().trim().max(2_000).optional(),
});

router.use("*", requireAuth, requireAdmin);

router.get("/tier/applications", async (c) => {
  const { status } = parseWithSchema(listQuerySchema, c.req.query());
  const applications = await prisma.tierApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      requestedTier: true,
      status: true,
      note: true,
      documentKeys: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          currentTier: true,
        },
      },
    },
  });

  return c.json({
    applications: applications.map((application) => ({
      ...application,
      createdAt: application.createdAt.toISOString(),
    })),
  });
});

router.post("/tier/:applicationId/decision", async (c) => {
  const admin = getAuthUser(c);
  const applicationId = c.req.param("applicationId");
  const input = parseWithSchema(decisionSchema, await c.req.json());

  const application = await prisma.tierApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: {
        select: { id: true, email: true, displayName: true },
      },
    },
  });
  if (!application) {
    throw new AppError(404, "NOT_FOUND", "Tier application not found");
  }

  const reviewedAt = new Date();
  const nextStatus = input.decision === "APPROVED" ? "APPROVED" : "REJECTED";

  await prisma.$transaction(async (tx) => {
    await tx.tierApplication.update({
      where: { id: applicationId },
      data: {
        status: nextStatus,
        reviewedBy: admin.id,
        reviewedAt,
        reviewerNote: input.reviewerNote,
      },
    });

    if (input.decision === "APPROVED") {
      await tx.user.update({
        where: { id: application.user.id },
        data: { currentTier: application.requestedTier },
      });
    }
  });

  await sendMail({
    to: application.user.email,
    subject:
      input.decision === "APPROVED"
        ? "Tsunagu — Tier 申請が承認されました"
        : "Tsunagu — Tier 申請内容について",
    html:
      input.decision === "APPROVED"
        ? `<p>${application.user.displayName} さんの Tier 申請が承認されました。</p>`
        : `<p>${application.user.displayName} さんの Tier 申請は今回は承認されませんでした。</p><p>${input.reviewerNote ?? ""}</p>`,
  });

  setAuditEntry(c, {
    action: input.decision === "APPROVED" ? "TIER_APPROVED" : "TIER_REJECTED",
    resourceId: applicationId,
    resourceType: "TierApplication",
  });

  return c.json({
    application: {
      id: application.id,
      status: nextStatus,
      reviewedAt: reviewedAt.toISOString(),
      reviewerNote: input.reviewerNote ?? null,
    },
  });
});

export default router;
