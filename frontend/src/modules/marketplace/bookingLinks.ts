import type { BookingSlot } from "@/composables/booking/types";

// TYPES
export interface BookingLinkContext {
  businessId: number;
  serviceId: number;
  branchId: number;
  date: string;
  source?: "marketplace" | "assistant" | "express";
  promoCode?: string;
  durationMinutes?: number;
  participants?: number;
}

// LINKS
export const slotBookingLink = (
  context: BookingLinkContext,
  slot?: BookingSlot,
): string => {
  const params = new URLSearchParams({
    book: "1",
    service_id: String(context.serviceId),
    branch_id: String(context.branchId),
    date: context.date,
    source: context.source ?? "marketplace",
  });
  if (slot) params.set("time", slot.start_time.slice(0, 5));
  if (slot?.professional_id)
    params.set("professional_id", String(slot.professional_id));
  if (slot?.resource_id) params.set("resource_id", String(slot.resource_id));
  const duration = slot?.duration_minutes ?? context.durationMinutes;
  if (duration) params.set("duration_minutes", String(duration));
  const participants = slot?.participants ?? context.participants;
  if (participants) params.set("participants", String(participants));
  if (context.promoCode) params.set("promo_code", context.promoCode);
  return `/cliente/business/${context.businessId}?${params}`;
};
