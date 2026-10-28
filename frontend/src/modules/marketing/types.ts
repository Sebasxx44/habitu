import type { Business } from "@/types/models";

// TYPES
export interface BusinessRecommendation {
  business: Business & { distance?: number };
  score: number;
}
export interface MarketingAd {
  id: number;
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  placement?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  impressions_count?: number;
  clicks_count?: number;
  budget?: number;
  sponsored?: boolean;
  delivery_token?: string;
}
export interface CreateMarketingAd {
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  placement: string;
  start_date: string;
  end_date: string;
  budget?: number;
}
export interface MarketingPromotion {
  id: number;
  code?: string;
  promo_code?: string;
  title?: string;
  description?: string;
  discount?: number;
  discount_value?: number;
  discount_type?: string;
  type?: "PORCENTAJE" | "FIJO";
  end_date?: string;
}
export interface PromotionValidation {
  valid: boolean;
  discount: number;
  final_total?: number;
  message?: string;
}
