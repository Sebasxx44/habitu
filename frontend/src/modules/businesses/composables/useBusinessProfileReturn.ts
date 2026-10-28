import { useLocation, useNavigate, type Location } from "react-router-dom";
import type { BusinessProfileReturn } from "@/modules/discovery/navigationTypes";
import { readDiscoveryNavigationState } from "@/modules/discovery/services/discoveryReturn";

// COMPOSABLE
export const useBusinessProfileReturn = (): BusinessProfileReturn => {
  // SERVICES
  const location: Location<object | null> = useLocation();
  const navigate = useNavigate();

  // DERIVED STATE
  const state = readDiscoveryNavigationState(location.state);

  // EXPOSE
  return {
    navigation: {
      state,
      back: () => {
        if (state) void navigate(-1);
        else void navigate("/cliente/explore");
      },
    },
  };
};
