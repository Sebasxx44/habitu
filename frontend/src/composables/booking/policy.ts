import type {
  BookingBusiness,
  BookingService,
} from "@/composables/booking/types";
import type { Service } from "@/types/models";

// TYPES
export type BookingModel = NonNullable<Service["booking_model"]>;

// POLICY
export const bookingModel = (
  service: BookingService | undefined | null,
  business: BookingBusiness,
): BookingModel => {
  if (service?.booking_model) return service.booking_model;
  if (business.uses_resources && business.uses_professionals === false)
    return "resource";
  if (service?.requires_professional ?? business.uses_professionals)
    return "professional";
  return business.uses_resources ? "resource" : "direct";
};
export const hasProfessionalChoice = (
  service: BookingService | undefined | null,
  business: BookingBusiness,
): boolean => {
  const model = bookingModel(service, business);
  return (
    model === "professional" ||
    model === "optional_professional" ||
    (model === "resource" && service?.resource_professional_optional === true)
  );
};
export const bookingDurations = (
  service: BookingService | undefined | null,
): number[] => {
  const base = service?.duration_minutes ?? service?.duration ?? 30;
  return service?.duration_mode === "selectable" &&
    service.duration_options?.length
    ? [...new Set(service.duration_options)].sort((left, right) => left - right)
    : [base];
};
