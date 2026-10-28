import { useEffect, useState } from "react";
import { analyticsToday } from "@/modules/analytics/period";
import {
  rangeForPreset,
  sameDateRange,
  validDateRange,
} from "@/modules/analytics/dateRange";
import type {
  DateRangeDraftState,
  DateRangeFilterProps,
  DateRangePreset,
} from "@/modules/analytics/dateRangeTypes";

// COMPOSABLE
export const useDateRangeDraft = ({
  value,
  onChange,
  maxDate = analyticsToday(),
  disabled = false,
}: DateRangeFilterProps): DateRangeDraftState => {
  // STATE
  const [draft, setDraft] = useState(value);
  const [attempted, setAttempted] = useState(false);

  // EFFECTS
  useEffect(() => {
    setDraft(value);
    setAttempted(false);
  }, [value.preset, value.start, value.end]);

  // COMPUTED
  const valid = validDateRange(draft, maxDate);
  const changed = !sameDateRange(draft, value);

  // ACTIONS
  const selectPreset = (preset: DateRangePreset): void => {
    if (disabled) return;
    setAttempted(false);
    if (preset === "custom") {
      setDraft((current) => ({ ...current, preset }));
      return;
    }
    const next = rangeForPreset(preset, maxDate);
    setDraft(next);
    onChange(next);
  };
  const setDate = (field: "start" | "end", date: string): void => {
    if (!disabled)
      setDraft((current) => ({ ...current, preset: "custom", [field]: date }));
  };
  const apply = (): void => {
    setAttempted(true);
    if (!disabled && valid && changed) onChange(draft);
  };
  const reset = (): void => {
    setDraft(value);
    setAttempted(false);
  };

  // PUBLIC API
  return {
    selection: { draft, changed, selectPreset, setDate },
    validation: { valid, showError: attempted && !valid },
    actions: { apply, reset },
  };
};
