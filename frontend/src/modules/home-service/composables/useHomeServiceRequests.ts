import { useCallback, useEffect, useRef, useState } from "react";
import {
  onDemandService,
  trackingService,
  type OnDemandLocation,
  type OnDemandRequest,
} from "@/services/ondemand/ondemandService";
import { isHomeServiceActive } from "@/modules/home-service/helpers";
import type { HomeServiceRequestsState } from "@/modules/home-service/types";
import { useRealtimeRefresh } from "@/modules/realtime/useRealtimeRefresh";

// COMPOSABLE
export const useHomeServiceRequests = (): HomeServiceRequestsState => {
  // STATE
  const [requests, setRequests] = useState<OnDemandRequest[]>([]);
  const [selected, setSelected] = useState<OnDemandRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [professionalLocation, setProfessionalLocation] =
    useState<OnDemandLocation | null>(null);
  const selectedRef = useRef<OnDemandRequest | null>(null);
  const loaded = useRef(false);
  const pending = useRef(false);
  const revision = useRef(0);
  const mounted = useRef(true);

  // ACTIONS
  const select = useCallback((request: OnDemandRequest | null) => {
    revision.current += 1;
    selectedRef.current = request;
    setSelected(request);
    setProfessionalLocation(null);
  }, []);
  const replace = useCallback((request: OnDemandRequest) => {
    revision.current += 1;
    setRequests((current) => [
      request,
      ...current.filter((item) => item.id !== request.id),
    ]);
    selectedRef.current = request;
    setSelected(request);
    setError(null);
    setUpdatedAt(new Date());
  }, []);
  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    const version = revision.current;
    setRefreshing(true);
    try {
      const result = await onDemandService.getAll();
      if (!mounted.current || version !== revision.current) return;
      setRequests(result);
      const active = selectedRef.current
        ? (result.find((item) => item.id === selectedRef.current?.id) ??
          selectedRef.current)
        : !loaded.current
          ? (result.find(isHomeServiceActive) ?? null)
          : null;
      selectedRef.current = active;
      setSelected(active);
      setUpdatedAt(new Date());
      setError(null);
      loaded.current = true;
    } catch (failure) {
      if (mounted.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "No se pudieron cargar tus solicitudes.",
        );
    } finally {
      pending.current = false;
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // LIFECYCLE
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);
  useRealtimeRefresh(["on-demand", "tracking"], refresh, {
    fallbackMs: 60000,
    minIntervalMs: 5000,
  });
  useEffect(() => {
    const professionalId = selected?.professional_id;
    if (
      !professionalId ||
      !selected ||
      !["ACCEPTED", "ON_THE_WAY", "IN_PROGRESS"].includes(selected.status)
    ) {
      setProfessionalLocation(null);
      return;
    }
    let disposed = false;
    void trackingService
      .getLatestLocation(professionalId)
      .then((location) => {
        if (!disposed) setProfessionalLocation(location);
      })
      .catch(() => {
        if (!disposed) setProfessionalLocation(null);
      });
    return () => {
      disposed = true;
    };
  }, [selected?.professional_id, selected?.status, updatedAt]);

  // RETURN
  return {
    requests,
    selected,
    loading,
    refreshing,
    error,
    updatedAt,
    professionalLocation,
    select,
    refresh,
    replace,
  };
};
