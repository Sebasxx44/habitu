import type { Resource, Service, ServiceMedia } from "@/types/models";
import type {
  BookingPolicyState,
  ServiceStats,
} from "@/modules/services/bookingPolicyTypes";
import type { MediaEditorState } from "@/modules/media/mediaTypes";

// API CONTRACTS
export interface AdminServiceResponse extends Omit<
  Service,
  "price" | "category"
> {
  price: number | string;
  category?: string | { id: number; name: string } | null;
}
export interface ServicesPageResponse {
  data: { data: AdminServiceResponse[]; last_page: number };
}

// CATALOG
export type ServiceStatusFilter = "all" | "active" | "inactive";
export type ServiceSort = "name" | "price-asc" | "price-desc" | "duration";
export type ServiceLayout = "grid" | "list";
export interface ServicesDataState {
  catalog: { services: Service[]; resources: Resource[] };
  status: { loading: boolean; refreshing: boolean; error: string };
  actions: { refresh: () => Promise<void>; saved: (service: Service) => void };
}
export interface ServiceCatalogState {
  filters: {
    search: string;
    category: string;
    status: ServiceStatusFilter;
    sort: ServiceSort;
    layout: ServiceLayout;
    applied: boolean;
  };
  results: {
    services: Service[];
    categories: string[];
    total: number;
    active: number;
    averageDuration: number;
    averagePrice: number;
  };
  actions: {
    filter: (
      key: "q" | "category" | "status" | "sort" | "layout",
      value: string,
    ) => void;
    reset: () => void;
  };
}

// EDITOR
export interface ServiceForm {
  name: string;
  description: string;
  price: string;
  duration: string;
  category: string;
  image_url: string;
  media_gallery: ServiceMedia[];
  is_active: boolean;
}
export interface ServiceEditorState {
  form: { value: ServiceForm; error: string; saving: boolean; dirty: boolean };
  booking: BookingPolicyState;
  media: MediaEditorState;
  actions: {
    field: <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) => void;
    save: () => Promise<void>;
    cover: (file: File) => Promise<void>;
    gallery: (files: File[]) => Promise<void>;
    removeMedia: (index: number) => void;
    caption: (index: number, text: string) => void;
  };
}
export interface ServiceActionsState {
  status: { pending: boolean; error: string };
  actions: { toggle: () => Promise<void>; remove: () => Promise<void> };
}
export interface ServiceInsightsState {
  insights: { data: ServiceStats | null; loading: boolean; error: string };
  actions: { refresh: () => Promise<void> };
}
