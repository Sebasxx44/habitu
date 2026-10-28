import { brand } from '@/config/brand';

// PRODUCT CONFIGURATION
export const conciergeName =
  import.meta.env?.VITE_CONCIERGE_NAME?.trim() || brand.assistantName;
export const conciergeIntents = [
  "today",
  "nearby",
  "promotions",
  "football",
  "beauty",
  "wellness",
  "repeat",
  "appointments",
] as const;
export type ConciergeIntent = (typeof conciergeIntents)[number];
