import type { RefObject } from "react";
import type { DiscoverySearchState } from "@/modules/discovery/searchTypes";

// TYPES
export interface DiscoveryHeroProps {
  search: DiscoverySearchState["search"];
  filters: DiscoverySearchState["filters"];
  location: DiscoverySearchState["location"];
  onFilters: () => void;
}
export interface DiscoveryHeroSearchState {
  search: { formRef: RefObject<HTMLFormElement> };
  actions: { focusSearch: () => void };
}
export interface DiscoveryHeroPhoto {
  src: string;
  business: string;
  location: string;
  source: string;
}
