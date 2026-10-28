import type { KeyboardEvent } from "react";
import type { DiscoverySuggestion } from "@/modules/discovery/searchTypes";

// TYPES
export interface DiscoveryComboboxState {
  combobox: {
    inputId: string;
    listId: string;
    expanded: boolean;
    activeId: string | undefined;
    optionId: (index: number) => string;
    isActive: (index: number) => boolean;
  };
  actions: {
    open: () => void;
    close: () => void;
    change: (value: string) => void;
    choose: (suggestion: DiscoverySuggestion) => void;
    navigate: (event: KeyboardEvent<HTMLInputElement>) => void;
  };
}
