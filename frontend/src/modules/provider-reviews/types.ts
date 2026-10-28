// TYPES
export type ProviderKind = "business" | "professional";
export interface ReviewSubject {
  kind: ProviderKind;
  id: number;
  name: string;
}
export interface CheckDefinition {
  code: string;
  label: string;
  label_en: string;
}
export interface PublicProviderCheck extends CheckDefinition {
  reviewed_at: string;
  expires_at: string;
}
export type ProviderDecision = "APPROVED" | "REJECTED" | "REVOKED";
export interface ProviderCheck {
  id: number;
  code: string;
  state: ProviderDecision | "PENDING" | "EXPIRED";
  revision: number;
  reviewed_at: string | null;
  expires_at: string | null;
  review_note: string | null;
  documents: {
    id: number;
    name: string;
    mime_type: string;
    size: number;
    created_at: string;
  }[];
  audit: {
    action: string;
    from_state: string | null;
    to_state: string;
    reason: string | null;
    actor_id: number | null;
    created_at: string;
  }[];
}
export interface ProviderReviewDetail {
  subject: ReviewSubject;
  definitions: CheckDefinition[];
  document_retention_days: number;
  checks: ProviderCheck[];
}
export interface ProviderReviewState {
  data: {
    subjects: ReviewSubject[];
    detail: ProviderReviewDetail | null;
    loading: boolean;
    error: boolean;
  };
  selection: {
    key: string;
    select: (key: string) => void;
    query: string;
    setQuery: (query: string) => void;
  };
  actions: { search: () => Promise<void>; reload: () => Promise<void> };
}
export interface ProviderCheckState {
  data: { busy: boolean; error: boolean };
  form: {
    reason: string;
    setReason: (reason: string) => void;
    expiry: string;
    setExpiry: (expiry: string) => void;
    reviewed: boolean;
    setReviewed: (reviewed: boolean) => void;
  };
  actions: {
    submit: () => Promise<void>;
    upload: (file: File) => Promise<void>;
    download: (document: { id: number; name: string }) => Promise<void>;
    decide: (state: ProviderDecision) => Promise<void>;
  };
}
