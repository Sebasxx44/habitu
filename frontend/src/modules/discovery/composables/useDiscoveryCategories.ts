import { useState } from "react";
import type { CategoryPickerState } from "@/modules/discovery/filters/types";
import type { BusinessCategory } from "@/types/models";

// COMPOSABLE
export const useDiscoveryCategories = (
  categories: BusinessCategory[],
  selectedId: string,
): CategoryPickerState => {
  // STATE
  const [expanded, setExpanded] = useState(false);

  // DERIVED STATE
  const initial = categories.slice(0, 5);
  const selected = categories.find(
    (category) => String(category.id) === selectedId,
  );
  const visible = expanded
    ? categories
    : selected && !initial.includes(selected)
      ? [...initial.slice(0, 4), selected]
      : initial;

  // EXPOSE
  return {
    selection: {
      visible,
      expanded,
      canExpand: categories.length > 5,
      toggle: () => setExpanded((value) => !value),
    },
  };
};
