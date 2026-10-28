import { useEffect, useState } from "react";
import { categoryFilterChange } from "@/modules/discovery/filters/selection";
import { discoveryDay, discoveryDefaults } from "@/modules/discovery/query";
import type {
  FilterDraftOptions,
  FilterDraftState,
} from "@/modules/discovery/filters/types";
import type { DiscoveryFilterChange } from "@/modules/discovery/searchTypes";

// COMPOSABLE
export const useDiscoveryFilterDraft = ({
  open,
  filters,
  onClose,
}: FilterDraftOptions): FilterDraftState => {
  // STATE
  const [values, setValues] = useState(filters.values);

  // LIFECYCLE
  useEffect(() => {
    if (open) setValues(filters.values);
  }, [open, filters.values]);

  // VALIDATION
  const invalidPrice =
    [values.min_price, values.max_price].some(
      (value) =>
        value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0),
    ) ||
    (!!values.max_price &&
      Number(values.max_price) < Number(values.min_price || 0));
  const invalidTime =
    !!values.time_from &&
    !!values.time_to &&
    values.time_to <= values.time_from;
  const invalidDate =
    !!values.date &&
    (values.date < discoveryDay() ||
      (!!values.date_to && values.date_to < values.date));
  const valid = !invalidPrice && !invalidTime && !invalidDate;

  // ACTIONS
  const change = (patch: DiscoveryFilterChange) =>
    setValues((current) => ({ ...current, ...patch }));
  const reset = () =>
    setValues((current) => ({
      ...discoveryDefaults,
      q: current.q,
      sort: current.sort,
    }));
  const apply = () => {
    if (!valid) return;
    filters.change({ ...values, page: "1" });
    onClose();
  };
  const setDay = (date: string) =>
    change({
      date,
      date_to: "",
      time_from: "",
      time_to: "",
      available: date ? "1" : "",
    });
  const setCategory = (categoryId: string) =>
    change(categoryFilterChange(categoryId, values));

  // EXPOSE
  return {
    draft: { values, change, reset, apply, setDay, setCategory },
    validation: { invalidPrice, invalidTime, invalidDate, valid },
  };
};
