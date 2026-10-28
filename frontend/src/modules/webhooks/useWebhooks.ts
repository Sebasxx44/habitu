import { useEffect, useState } from "react";
import { httpService } from "@/services/auth/authService";
import { webhookService } from "@/services/platform/webhookService";
import type {
  WebhookDelivery,
  WebhookForm,
  WebhookState,
  WebhookView,
} from "@/modules/webhooks/types";

// CONSTANTS
export const webhookEvents = [
  "booking.created",
  "booking.confirmed",
  "booking.cancelled",
  "booking.rescheduled",
  "availability.released",
  "payment.approved",
  "service.started",
  "service.completed",
  "refund.updated",
  "payout.updated",
];
// COMPOSABLE
export const useWebhooks = (): WebhookState => {
  // STATE
  const [items, setItems] = useState<WebhookView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [value, setValue] = useState<WebhookForm>({
    name: "",
    url: "",
    events: [],
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [webhookId, setWebhookId] = useState<number | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [visible, setVisible] = useState<number | null>(null);
  // EFFECTS
  useEffect(() => {
    let current = true;
    setLoading(true);
    void webhookService
      .getWebhooks()
      .then((result) => {
        if (current) setItems(result);
      })
      .catch(() => {
        if (current) setError(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [revision]);
  // ACTIONS
  const refresh = () => {
    setError(false);
    setRevision((current) => current + 1);
  };
  const perform = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await operation();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const loadDeliveries = async (id: number) => {
    const response = await httpService.get<{ data: WebhookDelivery[] }>(
      `/v2/webhooks/${id}/deliveries`,
    );
    setWebhookId(id);
    setDeliveries(response.data);
  };
  // RETURN
  return {
    directory: {
      items,
      loading,
      busy,
      error,
      refresh,
      toggle: (item) =>
        perform(async () => {
          await webhookService.update(item.id, { active: !item.active });
          refresh();
        }),
      remove: (id) =>
        perform(async () => {
          await webhookService.delete(id);
          if (webhookId === id) {
            setWebhookId(null);
            setDeliveries([]);
          }
          refresh();
        }),
    },
    editor: {
      editingId,
      edit: (item) => {
        setEditingId(item.id);
        setValue({ name: item.name, url: item.url, events: [...item.events] });
      },
      cancel: () => {
        setEditingId(null);
        setValue({ name: "", url: "", events: [] });
      },
      value,
      setValue,
      toggleEvent: (event) =>
        setValue((current) => ({
          ...current,
          events: current.events.includes(event)
            ? current.events.filter((item) => item !== event)
            : [...current.events, event],
        })),
      create: () =>
        perform(async () => {
          if (editingId) await webhookService.update(editingId, value);
          else await webhookService.create(value);
          setEditingId(null);
          setValue({ name: "", url: "", events: [] });
          refresh();
        }),
    },
    history: {
      webhookId,
      items: deliveries,
      show: (id) => perform(() => loadDeliveries(id)),
      replay: (id) =>
        perform(async () => {
          await httpService.post(`/v2/webhooks/deliveries/${id}/replay`);
          if (webhookId) await loadDeliveries(webhookId);
        }),
    },
    secret: {
      visible,
      toggle: (id) => setVisible((current) => (current === id ? null : id)),
    },
  };
};
