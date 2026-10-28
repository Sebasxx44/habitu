import { DiscoveryHeroVisualTA } from "@/modules/discovery/components/DiscoveryHeroVisualTA";
import { DiscoverySearchPanelTA } from "@/modules/discovery/components/DiscoverySearchPanelTA";
import { useDiscoveryHeroSearch } from "@/modules/discovery/composables/useDiscoveryHeroSearch";
import type { DiscoveryHeroProps } from "@/modules/discovery/hero/types";

// COMPONENT
export const DiscoveryHeroTA = (props: DiscoveryHeroProps) => {
  // COMPOSABLES
  const { search, actions } = useDiscoveryHeroSearch();

  // RENDER
  return (
    <section className="habitu-discovery-hero" aria-label="HABITÜ">
      <DiscoveryHeroVisualTA onSearch={actions.focusSearch} />
      <div className="habitu-discovery-search">
        <DiscoverySearchPanelTA {...props} formRef={search.formRef} />
      </div>
    </section>
  );
};
