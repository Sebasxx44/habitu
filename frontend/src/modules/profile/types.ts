import type { User, AccountPreferences } from "@/types/auth";
export type { AccountPreferences } from "@/types/auth";
// API TYPES
export interface AccountProfile {
  user: Pick<
    User,
    "id" | "name" | "email" | "role" | "created_at" | "avatar_url" | "phone"
  >;
  preferences: AccountPreferences;
  security: { google_linked: boolean; two_factor_enabled: boolean };
  capabilities: { email_delivery: boolean };
}
export interface ProfileContact {
  name: string;
  phone: string | null;
}
export interface ProfileCredentials {
  current_password: string;
  two_factor_code?: string;
}
export interface ProfilePassword extends ProfileCredentials {
  password: string;
  password_confirmation: string;
}
export interface ProfileEmail extends ProfileCredentials {
  email: string;
}
// COMPOSABLE TYPES
export interface ProfileState {
  account: {
    data: AccountProfile | null;
    loading: boolean;
    error: string;
    reload: () => void;
  };
  changes: {
    busy: boolean;
    error: string;
    saved: boolean;
    contact: (input: ProfileContact) => Promise<boolean>;
    avatar: (file: File) => Promise<boolean>;
    removeAvatar: () => Promise<boolean>;
    preferences: (input: AccountPreferences) => Promise<boolean>;
    email: (input: ProfileEmail) => Promise<boolean>;
  };
}
export interface ProfileSecurityState {
  password: {
    current: string;
    next: string;
    confirmation: string;
    code: string;
  };
  feedback: { busy: boolean; error: string; saved: boolean };
  actions: {
    update: (
      field: "current" | "next" | "confirmation" | "code",
      value: string,
    ) => void;
    submit: () => Promise<void>;
  };
}
