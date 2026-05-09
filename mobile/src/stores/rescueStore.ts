import { create } from "zustand";

import type {
  AedDeviceSummary,
  RescueEvent,
  ResponderSummary,
  SosDetailRes,
} from "@/types/api";

type RescueState = {
  sessionId: string | null;
  state: string;
  responders: ResponderSummary[];
  aedCarrier: ResponderSummary | null;
  aedDevice: AedDeviceSummary | null;
  responderEtaSec: number | null;
  aedEtaSec: number | null;
  isOnline: boolean;
  hydrateFromServer: (data: SosDetailRes) => void;
  applyEvent: (event: RescueEvent) => void;
  reset: () => void;
};

const initialState = {
  sessionId: null,
  state: "PENDING",
  responders: [] as ResponderSummary[],
  aedCarrier: null as ResponderSummary | null,
  aedDevice: null as AedDeviceSummary | null,
  responderEtaSec: null as number | null,
  aedEtaSec: null as number | null,
  isOnline: true,
};

function sortResponders(responders: ResponderSummary[]): ResponderSummary[] {
  return [...responders].sort((left, right) => {
    const leftEta = left.etaSec ?? Number.MAX_SAFE_INTEGER;
    const rightEta = right.etaSec ?? Number.MAX_SAFE_INTEGER;

    return leftEta - rightEta;
  });
}

function deriveResponderEta(responders: ResponderSummary[]): number | null {
  return (
    sortResponders(responders).find((responder) => responder.etaSec !== null)
      ?.etaSec ?? null
  );
}

function updateResponderList(
  responders: ResponderSummary[],
  nextResponder: ResponderSummary
): ResponderSummary[] {
  const existing = responders.findIndex(
    (responder) => responder.id === nextResponder.id
  );

  if (existing === -1) {
    return sortResponders([...responders, nextResponder]);
  }

  const next = [...responders];
  next[existing] = {
    ...next[existing],
    ...nextResponder,
  };

  return sortResponders(next);
}

export const useRescueStore = create<RescueState>((set) => ({
  ...initialState,
  hydrateFromServer: (data) => {
    const responders = data.session.responders.filter(
      (responder) => responder.role === "RESPONDER"
    );
    const aedCarrier =
      data.session.responders.find(
        (responder) => responder.role === "AED_CARRIER"
      ) ?? null;

    set({
      sessionId: data.session.id,
      state: data.session.state,
      responders: sortResponders(responders),
      aedCarrier,
      aedDevice: data.session.aedDevice,
      responderEtaSec: deriveResponderEta(responders),
      aedEtaSec: aedCarrier?.etaSec ?? null,
      isOnline: true,
    });
  },
  applyEvent: (event) =>
    set((state) => {
      switch (event.type) {
        case "responder_assigned": {
          const nextResponder: ResponderSummary = {
            id: event.data.responderId,
            userId: event.data.userId,
            role: event.data.role,
            status: "ASSIGNED",
            tier: event.data.tier,
            displayName: event.data.displayName,
            lat: null,
            lng: null,
            etaSec: null,
            arrivedAt: null,
          };

          if (event.data.role === "AED_CARRIER") {
            return {
              ...state,
              aedCarrier: nextResponder,
            };
          }

          const responders = updateResponderList(state.responders, nextResponder);

          return {
            ...state,
            responders,
            responderEtaSec: deriveResponderEta(responders),
          };
        }
        case "responder_accepted": {
          const responders = state.responders.map((responder) =>
            responder.id === event.data.responderId
              ? {
                  ...responder,
                  status: "ACCEPTED",
                  etaSec: event.data.etaSec,
                }
              : responder
          );
          const aedCarrier =
            state.aedCarrier?.id === event.data.responderId
              ? {
                  ...state.aedCarrier,
                  status: "ACCEPTED",
                  etaSec: event.data.etaSec,
                }
              : state.aedCarrier;

          return {
            ...state,
            responders: sortResponders(responders),
            aedCarrier,
            responderEtaSec: deriveResponderEta(responders),
            aedEtaSec: aedCarrier?.etaSec ?? state.aedEtaSec,
          };
        }
        case "responder_location_update": {
          const responders = state.responders.map((responder) =>
            responder.id === event.data.responderId
              ? {
                  ...responder,
                  status:
                    responder.status === "ASSIGNED"
                      ? "ENROUTE"
                      : responder.status,
                  lat: event.data.lat,
                  lng: event.data.lng,
                  etaSec: event.data.etaSec,
                }
              : responder
          );
          const aedCarrier =
            state.aedCarrier?.id === event.data.responderId
              ? {
                  ...state.aedCarrier,
                  status:
                    state.aedCarrier.status === "ASSIGNED"
                      ? "ENROUTE"
                      : state.aedCarrier.status,
                  lat: event.data.lat,
                  lng: event.data.lng,
                  etaSec: event.data.etaSec,
                }
              : state.aedCarrier;

          return {
            ...state,
            responders: sortResponders(responders),
            aedCarrier,
            responderEtaSec: deriveResponderEta(responders),
            aedEtaSec: aedCarrier?.etaSec ?? state.aedEtaSec,
          };
        }
        case "responder_arrived": {
          const arrivedAt = new Date().toISOString();
          const responders = state.responders.map((responder) =>
            responder.id === event.data.responderId
              ? {
                  ...responder,
                  status: "ARRIVED",
                  etaSec: 0,
                  arrivedAt,
                }
              : responder
          );
          const aedCarrier =
            state.aedCarrier?.id === event.data.responderId
              ? {
                  ...state.aedCarrier,
                  status: "ARRIVED",
                  etaSec: 0,
                  arrivedAt,
                }
              : state.aedCarrier;

          return {
            ...state,
            responders: sortResponders(responders),
            aedCarrier,
            responderEtaSec: deriveResponderEta(responders),
            aedEtaSec: aedCarrier?.etaSec ?? state.aedEtaSec,
          };
        }
        case "responder_cancelled": {
          const responders = state.responders.map((responder) =>
            responder.id === event.data.responderId
              ? {
                  ...responder,
                  status: "CANCELLED",
                }
              : responder
          );
          const aedCarrier =
            state.aedCarrier?.id === event.data.responderId
              ? {
                  ...state.aedCarrier,
                  status: "CANCELLED",
                }
              : state.aedCarrier;

          return {
            ...state,
            responders,
            aedCarrier,
            responderEtaSec: deriveResponderEta(responders),
            aedEtaSec:
              aedCarrier?.status === "CANCELLED" ? null : state.aedEtaSec,
          };
        }
        case "aed_carrier_assigned": {
          return {
            ...state,
            aedCarrier: {
              id: event.data.responderId,
              userId: event.data.userId,
              role: "AED_CARRIER",
              status: "ASSIGNED",
              tier: "TIER3",
              displayName: state.aedCarrier?.displayName ?? "AED Carrier",
              lat: state.aedCarrier?.lat ?? null,
              lng: state.aedCarrier?.lng ?? null,
              etaSec: event.data.etaSec,
              arrivedAt: state.aedCarrier?.arrivedAt ?? null,
            },
            aedDevice: event.data.aed,
            aedEtaSec: event.data.etaSec,
          };
        }
        case "aed_arrived":
          return {
            ...state,
            aedDevice: event.data.aed,
            aedEtaSec: 0,
          };
        case "session_state":
          return {
            ...state,
            state: event.data.state,
          };
        case "dispatch_round_expanded":
          return {
            ...state,
          };
        case "ping":
          return {
            ...state,
            isOnline: true,
          };
      }
    }),
  reset: () => set({ ...initialState }),
}));

