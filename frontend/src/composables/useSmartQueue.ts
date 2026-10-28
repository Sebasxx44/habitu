import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useAuth } from "@/App";
import { useBusinessSelection } from "@/composables/useBusinessSelection";
import { smartQueueService } from "@/services/queue/smartQueueService";
import type {
  QueueEntry,
  QueueResponse,
  QueueState,
  SmartQueue,
} from "@/composables/queue/types";

// COMPOSABLE
export const useSmartQueue = (): QueueState => {
  const realtimeRevision = useRealtimeRevision(["queues","appointments"]);
  // STATE
  const { user, permissions } = useAuth();
  const businessSelection = useBusinessSelection(user?.barber_shop_id);
  const { businesses, businessId, search, setSearch } = businessSelection;
  const [queues, setQueues] = useState<SmartQueue[]>([]);
  const [queue, setQueue] = useState<SmartQueue | null>(null);
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const revision = useRef(0);
  const canJoin = user?.role === "CLIENTE" && !!user.cliente_id;
  const canManage =
    user?.role === "SUPERADMIN" ||
    (!!user?.barber_shop_id &&
      user.barber_shop_id === Number(businessId) &&
      user.role !== "CLIENTE" &&
      permissions.includes("appointments.edit"));

  // EFFECTS
  useEffect(() => {
    void refresh();
    return () => {
      revision.current++;
    };
  }, [businessId, realtimeRevision]);

  // ACTIONS
  const fail = (cause: Error) => {
    const data = isAxiosError<QueueResponse<null>>(cause)
      ? cause.response?.data
      : undefined;
    setError(
      data?.error ||
        data?.message ||
        "No se pudo actualizar la fila. Inténtalo nuevamente.",
    );
  };
  const view = async (id: number) => {
    const request = ++revision.current;
    setLoading(true);
    setError(null);
    try {
      const data = await smartQueueService.getQueueStatus(id);
      if (request === revision.current) {
        setQueue(data);
        setEntry(
          (current) =>
            (current &&
              data.entries?.find((ticket) => ticket.id === current.id)) ||
            null,
        );
      }
    } catch (cause) {
      if (request === revision.current)
        fail(cause instanceof Error ? cause : new Error());
    } finally {
      if (request === revision.current) setLoading(false);
    }
  };
  const refresh = async () => {
    if (!businessId) {
      setQueues([]);
      setLoading(false);
      return;
    }
    if (queue) {
      await view(queue.id);
      return;
    }
    const request = ++revision.current;
    setLoading(true);
    setError(null);
    try {
      const data = await smartQueueService.getByBusiness(Number(businessId));
      if (request === revision.current) setQueues(data);
    } catch (cause) {
      if (request === revision.current)
        fail(cause instanceof Error ? cause : new Error());
    } finally {
      if (request === revision.current) setLoading(false);
    }
  };
  const mutate = async (
    operation: () => Promise<QueueEntry>,
    keepTicket = false,
  ) => {
    if (busy.current || !queue) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await operation();
      if (keepTicket) setEntry(result);
      await view(queue.id);
    } catch (cause) {
      fail(cause instanceof Error ? cause : new Error());
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const selectBusiness = (id: string) => {
    revision.current++;
    setQueue(null);
    setEntry(null);
    setQueues([]);
    businessSelection.selectBusiness(id);
  };
  const back = () => {
    revision.current++;
    setQueue(null);
    setEntry(null);
    setError(null);
    setLoading(false);
  };

  // RETURN
  return {
    selection: {
      businesses,
      businessId,
      selectBusiness,
      search,
      setSearch,
      queue,
      view,
      back,
    },
    list: {
      queues,
      loading,
      error: error || businessSelection.error,
      refresh: async () => {
        businessSelection.reload();
        await refresh();
      },
    },
    ticket: {
      entry,
      pending,
      canJoin,
      canManage,
      join: async () => {
        if (queue && user?.cliente_id)
          await mutate(
            () => smartQueueService.joinQueue(queue.id, user.cliente_id!),
            true,
          );
      },
      cancel: async () => {
        if (entry) await mutate(() => smartQueueService.cancelEntry(entry.id));
      },
      callNext: async () => {
        if (canManage && queue)
          await mutate(() => smartQueueService.callNext(queue.id));
      },
      serve: async (id: number) => {
        if (canManage) await mutate(() => smartQueueService.startServing(id));
      },
      complete: async (id: number) => {
        if (canManage) await mutate(() => smartQueueService.completeEntry(id));
      },
    },
  };
};
