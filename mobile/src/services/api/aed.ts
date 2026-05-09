import { request } from "@/services/api/client";
import type { AedNearbyRes } from "@/types/api";

type NearbyInput = {
  lat: number;
  lng: number;
  radiusM?: number;
  limit?: number;
};

export function nearby(input: NearbyInput): Promise<AedNearbyRes> {
  return request<AedNearbyRes>("GET", "/aed/nearby", {
    query: input,
  });
}

