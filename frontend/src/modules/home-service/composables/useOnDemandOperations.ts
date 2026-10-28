import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  onDemandService,
  type OnDemandRequest,
  type OnDemandStatus,
} from "@/services/ondemand/ondemandService";
import {
  HOME_SERVICE_NEXT_STATUS,
  isHomeServiceActive,
} from "@/modules/home-service/helpers";
import type { OnDemandOperationsState } from "@/modules/home-service/types";
import { useRealtimeRefresh } from "@/modules/realtime/useRealtimeRefresh";

// COMPOSABLE
export const useOnDemandOperations = (
  onlyActive = false,
): OnDemandOperationsState => {
  // STATE
  const [requests, setRequests] = useState<OnDemandRequest[]>([]);
  const [selected, setSelected] = useState<OnDemandRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<OnDemandStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [finalPrices, setFinalPrices] = useState<Record<number, string>>({});
  const pending = useRef(false);
  const mutation = useRef(false);
  const mounted = useRef(true);
  const revision = useRef(0);

  // SERVICES
  const { addToast } = useToast();

  // COMPUTED
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("es");
    return requests.filter(
      (request) =>
        (!onlyActive || isHomeServiceActive(request)) &&
        (status === "ALL" || request.status === status) &&
        (!search ||
          [
            request.request_code,
            request.client_address,
            request.description,
            request.client?.name,
            request.professional?.name,
          ].some((value) => value?.toLocaleLowerCase("es").includes(search))),
    );
  }, [requests, onlyActive, status, query]);

  // ACTIONS
  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    const version = revision.current;
    setRefreshing(true);
    try {
      const result = await onDemandService.getAll();
      if (!mounted.current || version !== revision.current) return;
      setRequests(result);
      setSelected((current) =>
        current
          ? (result.find((request) => request.id === current.id) ?? null)
          : null,
      );
      setUpdatedAt(new Date());
      setError(null);
    } catch (failure) {
      if (mounted.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "No pudimos actualizar las solicitudes.",
        );
    } finally {
      pending.current = false;
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);
  const advance = async (request: OnDemandRequest) => {
    if (mutation.current) return;
    const nextStatus = HOME_SERVICE_NEXT_STATUS[request.status];
    if (request.status !== "SEARCHING" && !nextStatus) return;
    const finalPriceInput = finalPrices[request.id]?.trim();
    const finalPrice = finalPriceInput ? Number(finalPriceInput) : undefined;
    if (
      nextStatus === "COMPLETED" &&
      (finalPrice === undefined ||
        !Number.isFinite(finalPrice) ||
        finalPrice < 0 ||
        finalPrice > 9999999999.99)
    ) {
      addToast(
        "Registra el valor final acordado con el cliente antes de completar el servicio.",
        "error",
      );
      return;
    }
    mutation.current = true;
    setBusyId(request.id);
    revision.current += 1;
    try {
      const result =
        request.status === "SEARCHING"
          ? await onDemandService.accept(request.id)
          : await onDemandService.updateStatus(
              request.id,
              nextStatus!,
              undefined,
              nextStatus === "COMPLETED" ? finalPrice : undefined,
            );
      revision.current += 1;
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id ? { ...item, ...result } : item,
        ),
      );
      setSelected((current) =>
        current?.id === request.id ? { ...current, ...result } : current,
      );
      setUpdatedAt(new Date());
      addToast("Estado del servicio actualizado.", "success");
    } catch (failure) {
      addToast(
        failure instanceof Error
          ? failure.message
          : "No se pudo actualizar el servicio.",
        "error",
      );
      void refresh();
    } finally {
      mutation.current = false;
      setBusyId(null);
    }
  };

  // LIFECYCLE
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);
  useRealtimeRefresh(["on-demand"], refresh, { fallbackMs: 60000 });

  // RETURN
  return {
    data: {
      requests,
      filtered,
      selected,
      loading,
      refreshing,
      error,
      updatedAt,
    },
    filters: { status, query, setStatus, setQuery },
    actions: { refresh, select: setSelected, advance, busyId },
    completion: {
      finalPrices,
      setFinalPrice: (id, value) =>
        setFinalPrices((current) => ({ ...current, [id]: value })),
    },
  };
};
