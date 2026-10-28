import type { Business } from "@/types/models";

// API TYPES
export interface DiscoveryService {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
}
export interface DiscoverySlot {
  date: string;
  start_time: string;
  professional_id?: number;
  resource_id?: number;
  resource_name?: string;
  duration_minutes?: number;
  participants?: number;
  service_id: number;
  branch_id: number;
}
export interface DiscoveryPromotion {
  id: number;
  title: string;
  type: string;
  discount: number;
  promo_code?: string;
}
export interface DiscoveryBusiness extends Business {
  currency?: string;
  price_from: number | null;
  distance_km: number | null;
  service_previews: DiscoveryService[];
  next_available: DiscoverySlot | null;
  active_promotion: DiscoveryPromotion | null;
}
export interface DiscoveryPage {
  data: DiscoveryBusiness[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
export interface DiscoverySuggestion {
  type: "business" | "service" | "professional" | "category" | "zone";
  id: number | null;
  label: string;
  business_id?: number;
  category_id?: number;
}
export interface DiscoveryFilters {
  q: string;
  category_id: string;
  service_id: string;
  professional_id: string;
  zone: string;
  min_price: string;
  max_price: string;
  min_rating: string;
  date: string;
  date_to: string;
  time_from: string;
  time_to: string;
  available: string;
  promotions: string;
  sort: string;
  lat: string;
  lng: string;
  radius: string;
  page: string;
  booking_model: string;
  duration_minutes: string;
  participants: string;
  resource_id: string;
  resource_type: string;
  sport_type: string;
  surface: string;
  covered: string;
}
export type DiscoveryFilterChange = Partial<DiscoveryFilters>;
export interface DiscoverySearchState {
  results: {
    page: DiscoveryPage;
    loading: boolean;
    error: string;
    reload: () => void;
  };
  filters: {
    values: DiscoveryFilters;
    count: number;
    change: (values: DiscoveryFilterChange) => void;
    clear: () => void;
  };
  search: {
    draft: string;
    setDraft: (value: string) => void;
    suggestions: DiscoverySuggestion[];
    suggest: boolean;
    setSuggest: (value: boolean) => void;
    choose: (value: DiscoverySuggestion) => void;
  };
  location: {
    point: { lat: number; lng: number } | null;
    loading: boolean;
    error: string;
    locate: () => void;
    clear: () => void;
  };
  favorites: {
    ids: number[];
    busy: number | null;
    error: string;
    toggle: (id: number) => Promise<void>;
  };
}
