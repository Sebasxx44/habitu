import type { Dispatch, SetStateAction } from "react";
import type { OutgoingWebhook } from "@/services/platform/webhookService";

// TYPES
export interface WebhookView extends OutgoingWebhook {
  secret?: string;
}
export interface WebhookDelivery {
  id: number;
  outbox_id: string | null;
  event: string;
  state:
    "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED" | "SUPPRESSED" | null;
  attempt: number;
  status_code: number | null;
  created_at: string;
  error_message: string | null;
}
export interface WebhookForm {
  name: string;
  url: string;
  events: string[];
}
export interface WebhookState {
  directory: {
    items: WebhookView[];
    loading: boolean;
    busy: boolean;
    error: boolean;
    refresh: () => void;
    toggle: (item: WebhookView) => Promise<void>;
    remove: (id: number) => Promise<void>;
  };
  editor: {
    value: WebhookForm;
    editingId: number | null;
    edit: (item: WebhookView) => void;
    cancel: () => void;
    setValue: Dispatch<SetStateAction<WebhookForm>>;
    toggleEvent: (event: string) => void;
    create: () => Promise<void>;
  };
  history: {
    webhookId: number | null;
    items: WebhookDelivery[];
    show: (id: number) => Promise<void>;
    replay: (id: number) => Promise<void>;
  };
  secret: { visible: number | null; toggle: (id: number) => void };
}
