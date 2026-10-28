export interface DistributionOption {
  id: number | string;
  name: string;
}
export interface DistributionSettings {
  enabled: boolean;
  theme: "light" | "dark";
  locale: "es" | "en";
  allowed_origins: string[];
}
export interface BookingLink {
  id: string;
  label: string;
  active: boolean;
  opens_count: number;
  url: string;
  widget_url: string;
}
export interface DistributionContext {
  businesses: DistributionOption[];
  business_id: number;
  settings: DistributionSettings;
  services: DistributionOption[];
  resources: DistributionOption[];
  branches: DistributionOption[];
  professionals: DistributionOption[];
  promotions: DistributionOption[];
  links: BookingLink[];
}
export interface LinkForm {
  label: string;
  service_id: string;
  resource_id: string;
  branch_id: string;
  professional_id: string;
  promo_code: string;
}
export interface DistributionState {
  listing: {
    data: DistributionContext | null;
    error: string;
    loading: boolean;
    businessId: string;
    refresh: () => void;
    selectBusiness: (id: string) => void;
  };
  editor: {
    form: LinkForm;
    busy: boolean;
    error: string;
    setField: (key: keyof LinkForm, value: string) => void;
    create: () => Promise<void>;
    remove: (id: string) => Promise<void>;
  };
}
