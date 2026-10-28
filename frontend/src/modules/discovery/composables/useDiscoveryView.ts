import { useSearchParams } from "react-router-dom";
import {
  readDiscoveryView,
  withDiscoveryView,
  type DiscoveryView,
} from "@/modules/discovery/services/discoveryView";

// TYPES
interface DiscoveryViewState {
  state: { view: DiscoveryView };
  actions: { setView: (view: DiscoveryView) => void };
}

// COMPOSABLE
export const useDiscoveryView = (): DiscoveryViewState => {
  const [params, setParams] = useSearchParams();
  return {
    state: { view: readDiscoveryView(params) },
    actions: {
      setView: (view) => {
        if (view !== readDiscoveryView(params))
          setParams((current) => withDiscoveryView(current, view));
      },
    },
  };
};
