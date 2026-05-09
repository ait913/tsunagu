import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";

import { prisma } from "../db/client.js";
import { env } from "../env.js";

export type PushTarget = {
  userId: string;
  expoPushToken: string;
};

const expo = env.EXPO_ACCESS_TOKEN
  ? new Expo({ accessToken: env.EXPO_ACCESS_TOKEN })
  : new Expo();

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const chunkEntries = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const handleTickets = async (
  targets: PushTarget[],
  messages: ExpoPushMessage[],
  tickets: ExpoPushTicket[],
): Promise<void> => {
  for (let index = 0; index < tickets.length; index += 1) {
    const ticket = tickets[index];
    const target = targets[index];
    const message = messages[index];
    if (!ticket || !target || !message) {
      continue;
    }

    if (
      ticket.status === "error" &&
      ticket.details &&
      "error" in ticket.details &&
      ticket.details.error === "DeviceNotRegistered"
    ) {
      await prisma.user.update({
        where: { id: target.userId },
        data: { expoPushToken: null },
      });
      continue;
    }

    if (ticket.status === "error") {
      console.warn("Expo push rejected", {
        userId: target.userId,
        message,
        ticket,
      });
    }
  }
};

const sendMessagesOnce = async (
  targets: PushTarget[],
  messages: ExpoPushMessage[],
): Promise<void> => {
  const messageChunks = chunkEntries(messages, 100);
  let cursor = 0;

  for (const chunk of messageChunks) {
    const targetChunk = targets.slice(cursor, cursor + chunk.length);
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    await handleTickets(targetChunk, chunk, tickets);
    cursor += chunk.length;
  }
};

export const sendPushMessages = async (
  messages: Array<{ target: PushTarget; message: ExpoPushMessage }>,
): Promise<void> => {
  const valid = messages.filter(({ target }) => Expo.isExpoPushToken(target.expoPushToken));
  if (valid.length === 0) {
    return;
  }

  const targets = valid.map(({ target }) => target);
  const payloads = valid.map(({ message, target }) => ({
    ...message,
    to: target.expoPushToken,
  }));

  try {
    await sendMessagesOnce(targets, payloads);
  } catch (error) {
    console.error("Expo push send failed, retrying once", error);
    await sleep(5_000);
    await sendMessagesOnce(targets, payloads);
  }
};
