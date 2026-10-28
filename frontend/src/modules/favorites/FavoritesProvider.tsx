import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { favoriteService } from "@/modules/favorites/favoriteService";
import { useRequireAccount } from "@/modules/auth/composables/useRequireAccount";
import type {
  FavoriteIds,
  FavoritesState,
  FavoriteType,
} from "@/modules/favorites/types";

// STATE
const empty: FavoriteIds = { business: [], service: [], professional: [] };
const FavoritesContext = createContext<FavoritesState | null>(null);

// PROVIDER
export const FavoritesProvider = ({
  userId,
  children,
}: {
  userId: number | null;
  children: ReactNode;
}) => {
  const realtimeRevision = useRealtimeRevision(["favorites"]);
  const { t } = useTranslation();
  const { actions: account } = useRequireAccount();
  const [ids, setIds] = useState<FavoriteIds>(empty);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const locked = useRef(false);
  const generation = useRef(0);

  // LIFECYCLE
  useEffect(() => {
    const controller = new AbortController();
    generation.current += 1;
    const requestGeneration = generation.current;
    setLoading(true);
    setIds(empty);
    setAccountId(userId);
    setError("");
    if (!userId) {
      setLoading(false);
      return;
    }
    favoriteService
      .identifiers(controller.signal)
      .then((nextIds) => {
        if (!controller.signal.aborted && requestGeneration === generation.current) setIds(nextIds);
      })
      .catch(() => {
        if (!controller.signal.aborted && requestGeneration === generation.current) setError(t("favorites.loadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted && requestGeneration === generation.current) setLoading(false);
      });
    return () => {
      controller.abort();
      generation.current += 1;
    };
  }, [userId, revision, t, realtimeRevision]);

  // ACTIONS
  const change = async (
    type: FavoriteType,
    id: number,
    saved: boolean,
  ): Promise<boolean> => {
    if (!account.requireAccount()) return false;
    if (!userId || accountId !== userId || loading || locked.current) return false;
    locked.current = true;
    setPending(`${type}:${id}`);
    setError("");
    const requestGeneration = generation.current;
    try {
      if (saved) await favoriteService.save(type, id);
      else await favoriteService.remove(type, id);
      if (requestGeneration !== generation.current) return false;
      setIds((current) => ({
        ...current,
        [type]: saved
          ? [...current[type].filter((value) => value !== id), id]
          : current[type].filter((value) => value !== id),
      }));
      return true;
    } catch {
      if (requestGeneration === generation.current)
        setError(t("favorites.saveError"));
      return false;
    } finally {
      locked.current = false;
      setPending(null);
    }
  };
  const toggle = async (type: FavoriteType, id: number): Promise<void> => {
    await change(type, id, !ids[type].includes(id));
  };
  const remove = (type: FavoriteType, id: number) => change(type, id, false);
  const retry = () => setRevision((current) => current + 1);
  return (
    <FavoritesContext.Provider
      value={{
        state: { ids: userId && accountId === userId ? ids : empty, loading: Boolean(userId) && (accountId !== userId || loading), pending: userId ? pending : null, error: userId ? error : "" },
        actions: { toggle, remove, retry },
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

// COMPOSABLE
export const useAccountFavorites = (): FavoritesState => {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("FavoritesProvider is required");
  return context;
};
