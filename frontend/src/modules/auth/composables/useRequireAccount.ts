import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { httpService } from "@/services/auth/authService";
import { loginPath } from "@/modules/auth/services/routeAccess";
import type { RequireAccountResult } from "@/modules/auth/types";

// COMPOSABLE
export const useRequireAccount = (): RequireAccountResult => {
  // SERVICES
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // COMPUTED
  const authenticated = Boolean(user) && httpService.isTokenValid();

  // ACTIONS
  const requireAccount = (returnTo?: string): boolean => {
    if (user && httpService.isTokenValid()) return true;
    if (user) httpService.clearToken();
    navigate(
      loginPath(
        returnTo ?? location.pathname + location.search + location.hash,
      ),
    );
    return false;
  };

  // EXPOSE
  return { identity: { authenticated }, actions: { requireAccount } };
};
