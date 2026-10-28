import { useRef } from "react";
import type { DiscoveryHeroSearchState } from "@/modules/discovery/hero/types";

// COMPOSABLE
export const useDiscoveryHeroSearch = (): DiscoveryHeroSearchState => {
  // STATE
  const formRef = useRef<HTMLFormElement>(null);

  // ACTIONS
  const focusSearch = () =>
    formRef.current
      ?.querySelector<HTMLInputElement>('input[role="combobox"]')
      ?.focus();

  // EXPOSE
  return { search: { formRef }, actions: { focusSearch } };
};
