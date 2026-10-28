import { useCallback, useEffect, useState } from "react";
import { reservationSupportService } from "@/modules/reservation-support/service";
import type {
  ConversationState,
  ReservationConversation,
  ReservationMessage,
  ReservationReference,
} from "@/modules/reservation-support/types";

// COMPOSABLE
export const useReservationConversation = (
  reference: ReservationReference,
): ConversationState => {
  // STATE
  const [conversation, setConversation] =
    useState<ReservationConversation | null>(null);
  const [messages, setMessages] = useState<ReservationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ACTIONS
  const refresh = useCallback(async () => {
    if (!conversation) return;
    try {
      setMessages(await reservationSupportService.messages(conversation.id));
      setError(null);
    } catch {
      setError("load");
    }
  }, [conversation]);
  const open = async () => {
    setLoading(true);
    setError(null);
    try {
      setConversation(await reservationSupportService.open(reference));
    } catch {
      setError("load");
    } finally {
      setLoading(false);
    }
  };
  const send: ConversationState["actions"]["send"] = async (content, file) => {
    if (!conversation || busy) return false;
    setBusy(true);
    try {
      const attachment = file
        ? await reservationSupportService.upload(conversation.id, file)
        : null;
      await reservationSupportService.send(
        conversation.id,
        content,
        attachment ? [attachment.id] : [],
      );
      await refresh();
      return true;
    } catch {
      setError("save");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const download = async (id: number) => {
    if (!conversation) return;
    try {
      await reservationSupportService.download(conversation.id, id);
    } catch {
      setError("load");
    }
  };
  // LIFECYCLE
  useEffect(() => {
    if (!conversation) return;
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [conversation, refresh]);
  // RETURN
  return {
    data: { conversation, messages, loading, busy, error },
    actions: { open, refresh, send, download },
  };
};
