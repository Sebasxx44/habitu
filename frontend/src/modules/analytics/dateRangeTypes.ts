// TYPES
export type DateRangePreset = "7" | "30" | "90" | "365" | "custom";

export interface DateRangeValue {
  preset: DateRangePreset;
  start: string;
  end: string;
}

export interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  maxDate?: string;
  disabled?: boolean;
}

export interface DateRangeDraftState {
  selection: {
    draft: DateRangeValue;
    changed: boolean;
    selectPreset: (preset: DateRangePreset) => void;
    setDate: (field: "start" | "end", value: string) => void;
  };
  validation: { valid: boolean; showError: boolean };
  actions: { apply: () => void; reset: () => void };
}
