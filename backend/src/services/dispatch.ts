import { AuditAction, RescueRole, ResponderStatus, Tier } from "@prisma/client";

import { prisma } from "../db/client.js";
import { realtimeBroker } from "../realtime/broker.js";
import {
  findNearestAed,
  findNearbyUsers,
  getSessionTarget,
  updateResponderGeom,
} from "./geo.js";
import { sendPushMessages, type PushTarget } from "./push.js";

const ROUND_RADII = [400, 1_000, 5_000] as const;
const ROUND_DELAYS_MS = [0, 60_000, 180_000] as const;

const dispatchTimers = new Map<string, NodeJS.Timeout[]>();

const symptomLabelMap = {
  NO_BREATHING: "呼吸なし",
  NO_CONSCIOUSNESS: "意識なし",
  BLEEDING: "出血",
  OTHER: "その他",
} as const;

const isAcceptedStatus = (status: ResponderStatus): boolean =>
  status === "ACCEPTED" || status === "ARRIVED" || status === "HANDED_OFF";

const cancelTimers = (sessionId: string): void => {
  for (const timer of dispatchTimers.get(sessionId) ?? []) {
    clearTimeout(timer);
  }
  dispatchTimers.delete(sessionId);
};

export const cancelDispatchSchedule = (sessionId: string): void => {
  cancelTimers(sessionId);
};

const createResponderAssignment = async (input: {
  sessionId: string;
  userId: string;
  role: RescueRole;
  lat: number;
  lng: number;
}) => {
  const responder = await prisma.responder.upsert({
    where: {
      sessionId_userId_role: {
        sessionId: input.sessionId,
        userId: input.userId,
        role: input.role,
      },
    },
    update: {},
    create: {
      sessionId: input.sessionId,
      userId: input.userId,
      role: input.role,
      status: "ASSIGNED",
    },
    select: {
      id: true,
      userId: true,
    },
  });

  await updateResponderGeom({
    responderId: responder.id,
    column: "notifiedGeom",
    lat: input.lat,
    lng: input.lng,
  });

  return responder;
};

const recordDispatchAudit = async (input: {
  userId: string;
  sessionId: string;
  role: RescueRole;
  round: number;
  delivered: boolean;
}) => {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: AuditAction.RESPONDER_NOTIFIED,
      resourceId: input.sessionId,
      resourceType: "RescueSession",
      payload: {
        role: input.role,
        round: input.round,
        delivered: input.delivered,
      },
    },
  });
};

const dispatchDemoNotification = async (sessionId: string): Promise<void> => {
  const target = await getSessionTarget(sessionId);
  if (!target.finderPushToken) {
    return;
  }

  await sendPushMessages([
    {
      target: { userId: target.finderId, expoPushToken: target.finderPushToken },
      message: {
        title: "Tsunagu — デモ通知",
        body: "これはデモ通知です",
        data: { kind: "DEMO", sessionId },
        channelId: "tsunagu-demo",
        priority: "high",
        sound: "default",
      },
    },
  ]);
};

const dispatchRound = async (sessionId: string, round: 0 | 1 | 2): Promise<void> => {
  const target = await getSessionTarget(sessionId);
  const session = await prisma.rescueSession.findUnique({
    where: { id: sessionId },
    select: {
      state: true,
      dispatchRound: true,
      responders: {
        select: {
          userId: true,
          status: true,
        },
      },
    },
  });

  if (!session || session.state === "ENDED" || session.state === "HANDED_OFF") {
    cancelTimers(sessionId);
    return;
  }

  if (target.isDemo) {
    await dispatchDemoNotification(sessionId);
    await prisma.rescueSession.update({
      where: { id: sessionId },
      data: { dispatchRound: round },
    });
    return;
  }

  if (round > 0 && session.responders.some((responder) => isAcceptedStatus(responder.status))) {
    return;
  }

  const alreadyNotifiedUserIds = session.responders.map((responder) => responder.userId);
  const radiusM = ROUND_RADII[round];
  const responders = await findNearbyUsers({
    lat: target.targetLat,
    lng: target.targetLng,
    radiusM,
    finderId: target.finderId,
    tiers: [Tier.TIER1, Tier.TIER2],
    excludeUserIds: alreadyNotifiedUserIds,
  });
  const carriers = await findNearbyUsers({
    lat: target.targetLat,
    lng: target.targetLng,
    radiusM,
    finderId: target.finderId,
    tiers: [Tier.TIER3],
    excludeUserIds: alreadyNotifiedUserIds,
  });

  const pushBatch: Array<{
    target: PushTarget;
    message: {
      title: string;
      body: string;
      data: Record<string, unknown>;
      channelId: string;
      priority: "high";
      sound: string;
    };
  }> = [];

  for (const candidate of responders) {
    const responder = await createResponderAssignment({
      sessionId,
      userId: candidate.id,
      role: RescueRole.RESPONDER,
      lat: candidate.lat,
      lng: candidate.lng,
    });

    realtimeBroker.publish(sessionId, {
      type: "responder_assigned",
      data: {
        responderId: responder.id,
        userId: candidate.id,
        role: RescueRole.RESPONDER,
        tier: candidate.currentTier,
        displayName: candidate.displayName,
      },
    });

    if (candidate.expoPushToken) {
      pushBatch.push({
        target: { userId: candidate.id, expoPushToken: candidate.expoPushToken },
        message: {
          title: "Tsunagu — 緊急ヘルプ要請",
          body: `${Math.round(candidate.distanceM)}m 先・${symptomLabelMap[target.symptom]}`,
          data: {
            kind: "RESPONSE",
            sessionId,
            distanceM: Math.round(candidate.distanceM),
            symptom: target.symptom,
            targetLat: target.targetLat,
            targetLng: target.targetLng,
            locationLabel: target.locationLabel,
          },
          channelId: "tsunagu-response",
          priority: "high",
          sound: "responder-alert.wav",
        },
      });
    }

    await recordDispatchAudit({
      userId: candidate.id,
      sessionId,
      role: RescueRole.RESPONDER,
      round,
      delivered: Boolean(candidate.expoPushToken),
    });
  }

  for (const candidate of carriers) {
    const responder = await createResponderAssignment({
      sessionId,
      userId: candidate.id,
      role: RescueRole.AED_CARRIER,
      lat: candidate.lat,
      lng: candidate.lng,
    });
    const aed = await findNearestAed(candidate.lat, candidate.lng, 5_000);

    realtimeBroker.publish(sessionId, {
      type: "responder_assigned",
      data: {
        responderId: responder.id,
        userId: candidate.id,
        role: RescueRole.AED_CARRIER,
        tier: candidate.currentTier,
        displayName: candidate.displayName,
      },
    });

    if (candidate.expoPushToken) {
      pushBatch.push({
        target: { userId: candidate.id, expoPushToken: candidate.expoPushToken },
        message: {
          title: "Tsunagu — AED運搬要請",
          body: `AED必要・${Math.round(candidate.distanceM)}m先で心停止`,
          data: {
            kind: "AED_CARRY",
            sessionId,
            distanceM: Math.round(candidate.distanceM),
            symptom: target.symptom,
            targetLat: target.targetLat,
            targetLng: target.targetLng,
            aedHint: aed
              ? {
                  id: aed.id,
                  name: aed.name,
                  lat: aed.lat,
                  lng: aed.lng,
                  distanceFromYouM: aed.distanceM ?? null,
                }
              : null,
            locationLabel: target.locationLabel,
          },
          channelId: "tsunagu-aed-carry",
          priority: "high",
          sound: "aed-alert.wav",
        },
      });
    }

    await recordDispatchAudit({
      userId: candidate.id,
      sessionId,
      role: RescueRole.AED_CARRIER,
      round,
      delivered: Boolean(candidate.expoPushToken),
    });
  }

  if (pushBatch.length > 0) {
    await sendPushMessages(pushBatch);
  }

  await prisma.rescueSession.update({
    where: { id: sessionId },
    data: { dispatchRound: round },
  });

  if (round > 0) {
    realtimeBroker.publish(sessionId, {
      type: "dispatch_round_expanded",
      data: { round, radiusM },
    });
  }
};

export const scheduleDispatch = async (sessionId: string): Promise<void> => {
  cancelTimers(sessionId);

  try {
    await dispatchRound(sessionId, 0);
  } catch (error) {
    console.error("Round 0 dispatch failed", error);
  }

  const target = await getSessionTarget(sessionId);
  if (target.isDemo) {
    return;
  }

  const timers: NodeJS.Timeout[] = [];
  for (const round of [1, 2] as const) {
    const timer = setTimeout(() => {
      void dispatchRound(sessionId, round).catch((error) => {
        console.error(`Round ${round} dispatch failed`, error);
      });
    }, ROUND_DELAYS_MS[round]);
    timers.push(timer);
  }

  dispatchTimers.set(sessionId, timers);
};
