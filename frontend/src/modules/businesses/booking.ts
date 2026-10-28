import type { Business } from "@/types/models";

// TYPES
export type BusinessBooking = Pick<
  Business,
  "booking_mode" | "booking_url" | "listing_source_url"
>;

// HELPERS
export const isExternalBooking = (business: BusinessBooking): boolean =>
  business.booking_mode === "external";

export const safeOfficialUrl = (value?: string | null): string | null => {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
};

export const externalBookingUrl = (business: BusinessBooking): string | null =>
  isExternalBooking(business) ? safeOfficialUrl(business.booking_url) : null;

export const listingSourceUrl = (business: BusinessBooking): string | null =>
  safeOfficialUrl(business.listing_source_url);
