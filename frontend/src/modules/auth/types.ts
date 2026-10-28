import type { FormEvent, RefObject } from "react";

// TYPES
export type LoginStep = "credentials" | "password" | "twoFactor";
export type LoginProvider = "credentials" | "google";
export type AccountAccessMode = "register" | "forgot" | "reset";
export interface AccountAccessFields { name: string; email: string; password: string; confirmation: string }
export type AccountAccessFieldErrors = Partial<Record<keyof AccountAccessFields, string>>;
export interface AccountAccessResult {
  form: { value: AccountAccessFields; setField: (key: keyof AccountAccessFields, value: string) => void; submit: (event: FormEvent<HTMLFormElement>) => Promise<void> };
  feedback: { busy: boolean; error: string; done: boolean; fieldErrors: AccountAccessFieldErrors };
  links: { login: string; register: string; forgot: string };
}

export interface LoginApiError {
  message?: string;
  errors?: Record<string, string[]>;
}

export interface LoginFormResult {
  fields: {
    email: string;
    password: string;
    twoFactorCode: string;
    setEmail: (value: string) => void;
    setPassword: (value: string) => void;
    setTwoFactorCode: (value: string) => void;
    challengeRef: RefObject<HTMLInputElement>;
  };
  feedback: {
    step: LoginStep;
    provider: LoginProvider;
    loading: boolean;
    error: string;
  };
  actions: {
    submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    signInWithGoogle: (credential: string) => Promise<void>;
    restart: () => void;
  };
}

export interface GoogleIdentityClient {
  initialize: (options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select: boolean;
    ux_mode: "popup";
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "continue_with";
      shape: "pill";
      width: number;
      locale: string;
    },
  ) => void;
}

export interface GoogleSignInResult {
  buttonRef: RefObject<HTMLDivElement>;
  feedback: { configured: boolean; status: "loading" | "ready" | "error" };
  actions: { retry: () => void };
}
