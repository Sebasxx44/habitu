import { useLocation } from "react-router-dom";
import type { DiscoveryNavigationResult } from "@/modules/discovery/navigationTypes";
import { discoveryNavigationState } from "@/modules/discovery/services/discoveryReturn";

// COMPOSABLE
export const useDiscoveryOrigin = (): DiscoveryNavigationResult => {
  // SERVICES
  const location = useLocation();

  // EXPOSE
  return {
    navigation: {
      state: discoveryNavigationState({
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        key: location.key,
      }),
    },
  };
};
