import { request } from "@/services/api/client";
import type { Tier, TierApplyRes, TierStatusRes } from "@/types/api";

type TierDocumentInput = {
  uri: string;
  name: string;
  type: string;
};

type TierApplyInput = {
  requestedTier: Tier;
  note?: string;
  documents: TierDocumentInput[];
};

export function apply(input: TierApplyInput): Promise<TierApplyRes> {
  const formData = new FormData();

  formData.append("requestedTier", input.requestedTier);

  if (input.note) {
    formData.append("note", input.note);
  }

  input.documents.forEach((document) => {
    formData.append(
      "documents",
      {
        uri: document.uri,
        name: document.name,
        type: document.type,
      } as unknown as Blob
    );
  });

  return request<TierApplyRes>("POST", "/tier/apply", {
    body: formData,
    multipart: true,
  });
}

export function getStatus(): Promise<TierStatusRes> {
  return request<TierStatusRes>("GET", "/tier/status");
}

