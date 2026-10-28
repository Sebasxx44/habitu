import { httpService } from "@/services/auth/authService";
import type {
  ProviderDecision,
  ProviderKind,
  ProviderReviewDetail,
  PublicProviderCheck,
  ReviewSubject,
} from "@/modules/provider-reviews/types";

// TYPES
interface ApiResponse<T> {
  data: T;
}
// HELPERS
const path = (subject: ReviewSubject) =>
  `/v2/provider-reviews/${subject.kind}/${subject.id}`;
// SERVICES
export const providerReviewService = {
  subjects: async (q: string) =>
    (
      await httpService.get<ApiResponse<ReviewSubject[]>>(
        "/v2/provider-reviews",
        { params: { q }, headers: { "Cache-Control": "no-cache" } },
      )
    ).data,
  detail: async (subject: ReviewSubject, signal?: AbortSignal) =>
    (
      await httpService.get<ApiResponse<ProviderReviewDetail>>(path(subject), {
        signal,
        headers: { "Cache-Control": "no-cache" },
      })
    ).data,
  submit: async (subject: ReviewSubject, code: string) =>
    httpService.post(path(subject), { code }),
  upload: async (subject: ReviewSubject, checkId: number, file: File) => {
    const body = new FormData();
    body.append("file", file);
    await httpService.post(`${path(subject)}/${checkId}/documents`, body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  download: async (
    subject: ReviewSubject,
    checkId: number,
    document: { id: number; name: string },
  ) => {
    const blob = await httpService.get<Blob>(
      `${path(subject)}/${checkId}/documents/${document.id}`,
      { responseType: "blob", headers: { "Cache-Control": "no-cache" } },
    );
    const url = URL.createObjectURL(blob);
    const anchor = documentElement(document.name, url);
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  decide: async (
    subject: ReviewSubject,
    checkId: number,
    state: ProviderDecision,
    reason: string,
    expiresAt: string,
    reviewed: boolean,
  ) =>
    httpService.put(`${path(subject)}/${checkId}/decision`, {
      state,
      reason,
      expires_at: state === "APPROVED" ? `${expiresAt}T23:59:59Z` : null,
      ...(state === "APPROVED" ? { evidence_reviewed: reviewed } : {}),
    }),
  publicChecks: async (kind: ProviderKind, id: number, signal: AbortSignal) =>
    (
      await httpService.get<ApiResponse<{ checks: PublicProviderCheck[] }>>(
        `/v2/public/provider-reviews/${kind}/${id}`,
        { signal, headers: { "Cache-Control": "no-cache" } },
      )
    ).data.checks,
};
// HELPERS
const documentElement = (name: string, url: string): HTMLAnchorElement => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  return anchor;
};
