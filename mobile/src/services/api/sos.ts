import { Linking } from "react-native";

import { request } from "@/services/api/client";
import { useAppStore } from "@/stores/appStore";
import type { CancelSosRes, SosDetailRes, SosReq, SosRes } from "@/types/api";

export function createSos(req: SosReq): Promise<SosRes> {
  return request<SosRes>("POST", "/sos", { body: req });
}

export function cancelSos(id: string): Promise<CancelSosRes> {
  return request<CancelSosRes>("POST", `/sos/${id}/cancel`);
}

export function getSos(id: string): Promise<SosDetailRes> {
  return request<SosDetailRes>("GET", `/sos/${id}`);
}

export function callEmergency(): void {
  const phone = useAppStore.getState().demoMode ? "09039655913" : "119";

  void Linking.openURL(`tel:${phone}`);
}

