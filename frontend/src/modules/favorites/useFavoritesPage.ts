import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { favoriteService } from "@/modules/favorites/favoriteService";
import { useAccountFavorites } from "@/modules/favorites/FavoritesProvider";
import type {
  FavoriteType,
  FavoritesPage,
  FavoritesPageState,
} from "@/modules/favorites/types";

// COMPOSABLE
export const useFavoritesPage = (): FavoritesPageState => {
  const realtimeRevision = useRealtimeRevision(["favorites","businesses","services","professionals"]);
  const { t } = useTranslation();
  const favorites = useAccountFavorites();
  const [type, setType] = useState<FavoriteType | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<FavoritesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  // LIFECYCLE
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    favoriteService
      .list(type, page, abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) setData(data);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(t("favorites.loadError"));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [type, page, revision, t, realtimeRevision]);

  // ACTIONS
  const filter = (value: FavoriteType | "") => {
    setType(value);
    setPage(1);
  };
  const retry = () => {
    favorites.actions.retry();
    setRevision((current) => current + 1);
  };
  const remove = async (kind: FavoriteType, id: number) => {
    if (await favorites.actions.remove(kind, id)) {
      if (data?.data.length === 1 && page > 1)
        setPage((current) => current - 1);
      else retry();
    }
  };
  return {
    results: {
      data,
      loading,
      error: error || favorites.state.error,
      pending: favorites.state.pending,
    },
    filters: { type, page, filter, setPage },
    actions: { retry, remove },
  };
};
