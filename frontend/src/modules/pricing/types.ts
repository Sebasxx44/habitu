// API TYPES
export interface DynamicPrice {
  base_price: number;
  price: number;
  adjustment: number;
  currency: string;
  timezone: string;
  rule: {
    id: number;
    name: string;
    rule_type: string;
    priority: number;
    multiplier: number;
    flat_adjustment: number;
    updated_at?: string;
  } | null;
}
export interface PricingRuleInput {
  business_id: number;
  service_id: number | null;
  name: string;
  rule_type: "PEAK_HOUR" | "DAY_OF_WEEK";
  conditions: { days_of_week: number[]; time_start: string; time_end: string };
  multiplier: number;
  flat_adjustment: number;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}
export interface PricingRule extends Omit<PricingRuleInput, "rule_type"> {
  id: number;
  rule_type: string;
  supported: boolean;
  service_name: string | null;
  timezone: string;
}
export interface PricingService {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
  duration_mode: "fixed" | "selectable";
  duration_options: number[];
  booking_model: string;
}
export interface PricingContext {
  businesses: { id: number; name: string }[];
  business: {
    id: number;
    name: string;
    services: PricingService[];
    branches: { id: number; name: string }[];
  } | null;
  timezone: string;
  currency: string;
}
export interface PricingSimulationInput {
  business_id: number;
  service_id: number;
  branch_id: number;
  date: string;
  duration_minutes?: number;
  participants?: number;
}
export interface PricingSlot {
  start_time: string;
  end_time: string;
  available: boolean;
  price: number;
  dynamic_pricing: DynamicPrice;
  professional_name: string | null;
  resource_name: string | null;
  resource_id: number | null;
  professional_id: number | null;
}
export interface PricingSimulation {
  date: string;
  timezone: string;
  slots: PricingSlot[];
}
// COMPOSABLE TYPES
export interface PricingCatalogState {
  catalog: {
    data: PricingContext | null;
    loading: boolean;
    error: string;
    reload: () => void;
  };
  selection: { id: number | null; select: (id: number) => void };
}
export interface PricingRulesState {
  collection: {
    items: PricingRule[];
    loading: boolean;
    error: string;
    reload: () => void;
  };
  mutations: {
    busy: boolean;
    error: string;
    save: (data: PricingRuleInput, id?: number) => Promise<boolean>;
    remove: (id: number) => Promise<boolean>;
  };
}
export interface PricingSimulationState {
  selection: {
    serviceId: string;
    branchId: string;
    date: string;
    duration: number;
    participants: number;
    service: PricingService | undefined;
    update: (
      patch: Partial<{
        serviceId: string;
        branchId: string;
        date: string;
        duration: number;
        participants: number;
      }>,
    ) => void;
  };
  result: {
    data: PricingSimulation | null;
    busy: boolean;
    error: string;
    run: () => void;
  };
}
