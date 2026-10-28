import { isBookingDate, isBookingTime } from "@/composables/booking/context";
import type { BookingContext } from "@/composables/booking/types";

// HELPERS
const positiveInteger = (value?: number): boolean =>
  value != null && Number.isSafeInteger(value) && value > 0;

export const bookingResumePath = (
  businessId: number,
  context: BookingContext,
): string => {
  if (!positiveInteger(businessId)) return "/cliente/explore";
  const params = new URLSearchParams({ book: "1" });
  const identifiers = {
    service_id: context.serviceId,
    professional_id: context.professionalId,
    branch_id: context.branchId,
    resource_id: context.resourceId,
    duration_minutes: context.durationMinutes,
    participants: context.participants,
  };
  for (const [key, value] of Object.entries(identifiers)) {
    if (positiveInteger(value)) params.set(key, String(value));
  }
  if (context.date && isBookingDate(context.date))
    params.set("date", context.date);
  if (context.time && isBookingTime(context.time))
    params.set("time", context.time);
  if (context.promoCode?.trim())
    params.set("promo_code", context.promoCode.trim().slice(0, 80));
  if (
    context.source &&
    ["marketplace", "express", "assistant"].includes(context.source)
  )
    params.set("source", context.source);
  return `/cliente/business/${businessId}?${params}`;
};
