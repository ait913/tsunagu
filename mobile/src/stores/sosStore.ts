import { create } from "zustand";

import { cancelSos as cancelSosRequest, createSos } from "@/services/api/sos";
import type { SosReq, SosStatus, Symptom } from "@/types/api";

type SosLocation = {
  lat: number;
  lng: number;
  accuracyM?: number;
  label?: string;
};

type SosState = {
  currentSosId: string | null;
  currentSessionId: string | null;
  status: SosStatus | null;
  symptom: Symptom | null;
  location: SosLocation | null;
  startSos: (input: SosReq) => Promise<void>;
  cancelSos: () => Promise<void>;
  endSos: () => void;
  setLocation: (location: SosLocation | null) => void;
};

const initialState = {
  currentSosId: null,
  currentSessionId: null,
  status: null,
  symptom: null,
  location: null,
};

export const useSosStore = create<SosState>((set, get) => ({
  ...initialState,
  startSos: async (input) => {
    const response = await createSos(input);

    set({
      currentSosId: response.sos.id,
      currentSessionId: response.rescueSession.id,
      status: response.sos.status,
      symptom: input.symptom,
      location: {
        lat: input.lat,
        lng: input.lng,
        accuracyM: input.accuracyM,
        label: input.locationLabel,
      },
    });
  },
  cancelSos: async () => {
    const { currentSosId } = get();

    if (!currentSosId) {
      return;
    }

    await cancelSosRequest(currentSosId);
    set({
      status: "CANCELLED",
      currentSessionId: null,
    });
  },
  endSos: () => set({ ...initialState }),
  setLocation: (location) => set({ location }),
}));

