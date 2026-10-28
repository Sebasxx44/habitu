import { useEffect, useId, useState } from "react";
import type { DiscoveryComboboxState } from "@/modules/discovery/comboboxTypes";
import type { DiscoverySearchState } from "@/modules/discovery/searchTypes";
import { nextSuggestionIndex } from "@/modules/discovery/services/suggestionNavigation";

// COMPOSABLE
export const useDiscoveryCombobox = (
  search: DiscoverySearchState["search"],
): DiscoveryComboboxState => {
  // STATE
  const id = useId();
  const [selection, setSelection] = useState({ query: "", index: -1 });

  // DERIVED STATE
  const expanded = search.suggest && search.suggestions.length > 0;
  const active =
    selection.query === search.draft &&
    selection.index >= 0 &&
    selection.index < search.suggestions.length
      ? selection.index
      : -1;
  const optionId = (index: number) => `${id}-suggestion-${index}`;
  const activeId = expanded && active >= 0 ? optionId(active) : undefined;

  // EFFECTS
  useEffect(() => {
    if (activeId)
      document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  // ACTIONS
  const reset = () => setSelection({ query: search.draft, index: -1 });
  const close = () => {
    reset();
    search.setSuggest(false);
  };
  const choose: DiscoveryComboboxState["actions"]["choose"] = (suggestion) => {
    close();
    search.choose(suggestion);
  };
  const navigate: DiscoveryComboboxState["actions"]["navigate"] = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      search.setSuggest(true);
      setSelection({
        query: search.draft,
        index: nextSuggestionIndex(
          active,
          search.suggestions.length,
          event.key,
        ),
      });
      return;
    }
    if (!expanded) return;
    if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(search.suggestions[active]);
    }
  };

  // EXPOSE
  return {
    combobox: {
      inputId: `${id}-search`,
      listId: `${id}-suggestions`,
      expanded,
      activeId,
      optionId,
      isActive: (index) => expanded && active === index,
    },
    actions: {
      open: () => {
        reset();
        search.setSuggest(true);
      },
      close,
      change: (value) => {
        setSelection({ query: value, index: -1 });
        search.setDraft(value);
        search.setSuggest(true);
      },
      choose,
      navigate,
    },
  };
};
