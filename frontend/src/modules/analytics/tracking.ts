import { httpService } from "@/services/auth/authService";

// TYPES
export type MarketplaceEvent =
  | "visit"
  | "search"
  | "business_view"
  | "service_view"
  | "booking_start"
  | "slot_selected"
  | "booking_confirmed"
  | "assistant_conversation"
  | "assistant_search"
  | "assistant_recommendations"
  | "assistant_click";
export interface AnalyticsPreferences {
  measurement: boolean;
  personalization: boolean;
  enabled: boolean;
}
export interface MarketplaceEventContext {
  source?: "marketplace" | "assistant" | "express";
  business_id?: number;
  service_id?: number;
  category_id?: number;
  appointment_id?: number;
  results_count?: number;
  conversation_id?: string;
  dedupe_key?: string;
}

// STATE
let preferences: AnalyticsPreferences | null = null;
let identity: string | null = null;
let pendingPreferences: Promise<AnalyticsPreferences | null> | null = null;
const delivered = new Set<string>();
const resetSession = (): void => {
  const token = localStorage.getItem("eb_token");
  if (identity === token) return;
  identity = token;
  preferences = null;
  pendingPreferences = null;
  delivered.clear();
  sessionStorage.removeItem("habitu-measurement-session");
};

// SERVICES
export const getAnalyticsPreferences =
  async (): Promise<AnalyticsPreferences | null> => {
    resetSession();
    if (!identity) return null;
    if (preferences) return preferences;
    if (pendingPreferences) return pendingPreferences;
    const requestedIdentity = identity;
    pendingPreferences = httpService
      .get<AnalyticsPreferences>("/analytics/preferences")
      .then((value) => {
        if (identity === requestedIdentity) preferences = value;
        return identity === requestedIdentity ? value : null;
      })
      .catch(() => null)
      .finally(() => {
        if (identity === requestedIdentity) pendingPreferences = null;
      });
    return pendingPreferences;
  };
export const saveAnalyticsPreferences = async (
  value: Pick<AnalyticsPreferences, "measurement" | "personalization">,
): Promise<AnalyticsPreferences> => {
  resetSession();
  const response = await httpService.put<AnalyticsPreferences>(
    "/analytics/preferences",
    value,
  );
  preferences = response;
  if (!response.measurement) {
    delivered.clear();
    sessionStorage.removeItem("habitu-measurement-session");
  }
  return response;
};
export const trackMarketplaceEvent = async (
  event: MarketplaceEvent,
  context: MarketplaceEventContext = {},
): Promise<void> => {
  const preference = await getAnalyticsPreferences();
  if (!preference?.enabled || !preference.measurement) return;
  const duplicate = context.dedupe_key
    ? `${event}:${context.dedupe_key}`
    : event === "visit"
      ? "visit"
      : null;
  if (duplicate && delivered.has(duplicate)) return;
  if (duplicate) delivered.add(duplicate);
  const session =
    sessionStorage.getItem("habitu-measurement-session") ?? crypto.randomUUID();
  sessionStorage.setItem("habitu-measurement-session", session);
  try {
    await httpService.post("/analytics/events", {
      event_id: crypto.randomUUID(),
      session_id: session,
      event,
      source: context.source ?? "marketplace",
      business_id: context.business_id,
      service_id: context.service_id,
      category_id: context.category_id,
      appointment_id: context.appointment_id,
      results_count: context.results_count,
      conversation_id: context.conversation_id,
    });
  } catch {
    if (duplicate) delivered.delete(duplicate);
  }
};
