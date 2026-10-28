import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import i18n from '@/i18n';
import { trackMarketplaceEvent } from '@/modules/analytics/tracking';
import { discoveryService } from "@/modules/discovery/services/discoveryService";
import {
  discoveryDefaults,
  readDiscoveryFilters,
} from "@/modules/discovery/query";
import { useDiscoveryLocation } from "@/modules/discovery/composables/useDiscoveryLocation";
import { useDiscoveryFavorites } from "@/modules/discovery/composables/useDiscoveryFavorites";
import type {
  DiscoveryFilterChange,
  DiscoveryPage,
  DiscoverySearchState,
  DiscoverySuggestion,
} from "@/modules/discovery/searchTypes";

// CONSTANTS
const emptyPage: DiscoveryPage = {
  data: [],
  total: 0,
  current_page: 1,
  last_page: 1,
  per_page: 12,
};

// COMPOSABLE
export const useDiscoverySearch = (): DiscoverySearchState => {
  const realtimeRevision = useRealtimeRevision(["businesses","branches","services","professionals","reviews","promotions"]);
  // STATE
  const { t: ui } = useTranslation("discoveryUi");
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const values = useMemo(
    () => readDiscoveryFilters(new URLSearchParams(query)),
    [query],
  );
  const [draft, setDraft] = useState(values.q);
  const [page, setPage] = useState(emptyPage);
  const [loading, setLoading] = useState(true);
  const [errorKey, setError] = useState<"loadError" | "offline" | "">("");
  const [revision, setRevision] = useState(0);
  const [suggestions, setSuggestions] = useState<DiscoverySuggestion[]>([]);
  const [suggest, setSuggest] = useState(false);
  // ACTIONS
  const change = useCallback(
    (patch: DiscoveryFilterChange) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          if (!("page" in patch)) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const location = useDiscoveryLocation(values, change);
  const favorites = useDiscoveryFavorites();
  const choose = (item: DiscoverySuggestion) => {
    setSuggest(false);
    setDraft("");
    if (item.type === "business" && item.id) {
      navigate(`/cliente/business/${item.id}`);
      return;
    }
    const patch: DiscoveryFilterChange = {
      q: "",
      service_id: "",
      professional_id: "",
    };
    if (item.type === "service" && item.id) patch.service_id = String(item.id);
    else if (item.type === "professional" && item.id)
      patch.professional_id = String(item.id);
    else if (item.type === "category" && item.id)
      patch.category_id = String(item.id);
    else if (item.type === "zone") patch.zone = item.label;
    else patch.q = item.label;
    change(patch);
  };
  // LIFECYCLE
  useEffect(() => {
    setDraft(values.q);
  }, [values.q]);
  useEffect(() => {
    if (draft === values.q) return;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        if (/\b(quiero|necesito|hoy|mañana|después|tomorrow|today|want|need|after)\b/i.test(draft) && draft.trim().split(/\s+/).length >= 3) {
          discoveryService.intent(draft, i18n.resolvedLanguage === 'en' ? 'en' : 'es', controller.signal).then((parsed) => {
            if (controller.signal.aborted) return;
            const patch: DiscoveryFilterChange = { q: '', service_id: '', professional_id: '', resource_id: '' };
            for (const [key, value] of Object.entries(parsed)) {
              if (key in discoveryDefaults) patch[key as keyof typeof patch] = typeof value === 'boolean' ? value ? '1' : '' : String(value);
            }
            if (patch.date || patch.time_from) patch.available = '1';
            change(patch);
          }).catch(() => { if (!controller.signal.aborted) change({ q: draft, service_id: '', professional_id: '' }); });
        } else change({ q: draft, service_id: '', professional_id: '' });
      },
      550,
    );
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [draft, values.q, change]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    discoveryService
      .search(values, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setPage(data);
          const source = window.location.pathname === '/cliente/on-demand' ? 'express' : 'marketplace';
          void trackMarketplaceEvent('visit', { source });
          void trackMarketplaceEvent('search', { source, category_id: values.category_id ? Number(values.category_id) : undefined, service_id: values.service_id ? Number(values.service_id) : undefined, results_count: data.total, dedupe_key: `${source}:${JSON.stringify(values)}:${revision}` });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPage(emptyPage);
          setError(
            navigator.onLine
              ? "loadError"
              : "offline",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [values, revision, realtimeRevision]);
  useEffect(() => {
    const controller = new AbortController();
    if (draft.trim().length < 2 || !suggest) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      discoveryService
        .suggest(draft, controller.signal)
        .then((rows) => {
          if (!controller.signal.aborted) setSuggestions(rows);
        })
        .catch(() => setSuggestions([]));
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [draft, suggest]);
  // DERIVED STATE
  const count =
    Object.entries(values).filter(
      ([key, value]) =>
        !["page", "q", "sort", "lat", "lng", "radius", "date_to"].includes(
          key,
        ) && value !== discoveryDefaults[key as keyof typeof discoveryDefaults],
    ).length + (location.point ? 1 : 0);
  return {
    results: {
      page,
      loading,
      error: errorKey ? ui(errorKey) : "",
      reload: () => setRevision((value) => value + 1),
    },
    filters: {
      values,
      count,
      change,
      clear: () => {
        setDraft("");
        setParams({});
        setSuggest(false);
      },
    },
    search: { draft, setDraft, suggestions, suggest, setSuggest, choose },
    location,
    favorites,
  };
};
