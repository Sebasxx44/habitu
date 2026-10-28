import { useEffect, useRef, useState } from "react";
import type { CategoryPickerState } from "@/modules/discovery/filters/types";
import type { BusinessCategory } from "@/types/models";

// COMPOSABLE
export const useDiscoveryCategories = (
  categories: BusinessCategory[],
  selectedId: string,
): CategoryPickerState => {
  // STATE
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

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

  // EFFECTS
  useEffect(() => {
    const list = listRef.current;
    if (!selectedId || !list || list.scrollWidth <= list.clientWidth) return;
    const selectedButton = list.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (selectedButton) list.scrollTo({ left: selectedButton.offsetLeft - list.offsetLeft - (list.clientWidth - selectedButton.offsetWidth) / 2 });
  }, [selectedId, categories]);

  // EXPOSE
  return {
    selection: {
      listRef,
      visible,
      expanded,
      canExpand: categories.length > 5,
      toggle: () => setExpanded((value) => !value),
    },
  };
};
