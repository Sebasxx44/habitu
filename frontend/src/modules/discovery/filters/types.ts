import type { RefObject } from "react";
import type {
  DiscoveryFilterChange,
  DiscoveryFilters,
  DiscoverySearchState,
} from "@/modules/discovery/searchTypes";
import type { BusinessCategory } from "@/types/models";

// TYPES
export interface FilterDraftOptions {
  open: boolean;
  filters: DiscoverySearchState["filters"];
  onClose: () => void;
}

export interface FilterDraftState {
  draft: {
    values: DiscoveryFilters;
    change: (patch: DiscoveryFilterChange) => void;
    reset: () => void;
    apply: () => void;
    setDay: (day: string) => void;
    setCategory: (category: string) => void;
  };
  validation: {
    invalidPrice: boolean;
    invalidTime: boolean;
    invalidDate: boolean;
    valid: boolean;
  };
}

export interface CategoryPickerState {
  selection: {
    listRef: RefObject<HTMLDivElement>;
    visible: BusinessCategory[];
    expanded: boolean;
    canExpand: boolean;
    toggle: () => void;
  };
}
