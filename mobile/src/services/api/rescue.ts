import { request } from "@/services/api/client";
import type {
  EndReq,
  EndRes,
  HandoffReq,
  HandoffRes,
  ResponderLocationReq,
  ResponderLocationRes,
  RespondReq,
  RespondRes,
} from "@/types/api";

export function respond(
  sessionId: string,
  req: RespondReq
): Promise<RespondRes> {
  return request<RespondRes>("POST", `/rescue/${sessionId}/respond`, {
    body: req,
  });
}

export function updateLocation(
  sessionId: string,
  responderId: string,
  req: ResponderLocationReq
): Promise<ResponderLocationRes> {
  return request<ResponderLocationRes>(
    "PATCH",
    `/rescue/${sessionId}/responder/${responderId}/location`,
    { body: req }
  );
}

export function handoff(
  sessionId: string,
  req: HandoffReq
): Promise<HandoffRes> {
  return request<HandoffRes>("POST", `/rescue/${sessionId}/handoff`, {
    body: req,
  });
}

export function end(sessionId: string, req: EndReq): Promise<EndRes> {
  return request<EndRes>("POST", `/rescue/${sessionId}/end`, {
    body: req,
  });
}

