import { t } from 'i18next'
import i18n from '@/i18n';
import { trackMarketplaceEvent } from '@/modules/analytics/tracking';
import { useCallback, useEffect, useRef, useState } from "react";
import { aiChatbotService } from "@/services/ai/aiChatbotService";
import type {
  AIConversation,
  AIMessage,
  AssistantContext,
  AssistantState,
} from "@/modules/assistant/types";

// COMPOSABLE
export const useBookingAssistant = (): AssistantState => {
  // STATE
  const [history, setHistory] = useState<AIConversation[]>([]);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [session, setSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [locating, setLocating] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(true);
  // ACTIONS
  const retryHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await aiChatbotService.getHistory();
      if (mounted.current) setHistory(result);
    } catch {
      if (mounted.current)
        setError(
          t('assistantErrors.history'),
        );
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void retryHistory();
    return () => {
      mounted.current = false;
    };
  }, [retryHistory]);
  const start = async () => {
    if (locked.current) return;
    locked.current = true;
    setLoading(true);
    setError("");
    try {
      const conversation = await aiChatbotService.start("BOOKING");
      setSession(conversation.session_id);
      void trackMarketplaceEvent('assistant_conversation', { source: 'assistant', conversation_id: conversation.session_id, dedupe_key: conversation.session_id });
      setMessages(conversation.messages ?? []);
      setHistory((previous) => [conversation, ...previous]);
    } catch {
      setError(t('assistantErrors.start'));
    } finally {
      locked.current = false;
      setLoading(false);
    }
  };
  const open = async (id: string) => {
    if (locked.current) return;
    locked.current = true;
    setLoading(true);
    setError("");
    try {
      const conversation = await aiChatbotService.getConversation(id);
      setSession(id);
      setMessages(conversation.messages ?? []);
      setText("");
    } catch {
      setError(t('assistantErrors.retrieve'));
    } finally {
      locked.current = false;
      setLoading(false);
    }
  };
  const send = async (preset?: string, context?: AssistantContext) => {
    const content = (preset ?? text).trim();
    if ((!content && !image) || locked.current) return;
    locked.current = true;
    setSending(true);
    setError("");
    const optimisticId = -Date.now();
    try {
      let current = session;
      if (!current) {
        const conversation = await aiChatbotService.start("BOOKING");
        current = conversation.session_id;
        setSession(current);
        void trackMarketplaceEvent('assistant_conversation', { source: 'assistant', conversation_id: current, dedupe_key: current });
        setMessages(conversation.messages ?? []);
        setHistory((previous) => [conversation, ...previous]);
      }
      setMessages((previous) => [
        ...previous,
        {
          id: optimisticId,
          role: "user",
          content: content || t('marketplace:concierge.image'),
          created_at: new Date().toISOString(),
        },
      ]);
      const response = await aiChatbotService.sendMessage(
        current,
        content,
        image,
        { ...position, ...context, locale: i18n.resolvedLanguage === "en" ? "en" : "es" },
      );
      setMessages((previous) => [...previous, response]);
      if (['search', 'availability', 'promotions'].includes(response.metadata?.intent ?? '')) void trackMarketplaceEvent('assistant_search', { source: 'assistant', conversation_id: current, results_count: response.metadata?.cards?.length ?? 0 });
      void trackMarketplaceEvent('assistant_recommendations', { source: 'assistant', conversation_id: current, results_count: response.metadata?.cards?.length ?? 0 });
      setText("");
      setImage(null);
    } catch {
      setMessages((previous) =>
        previous.filter((message) => message.id !== optimisticId),
      );
      setError(
        navigator.onLine
          ? t('assistantErrors.query')
          : t('assistantErrors.offline'),
      );
      if (preset) setText(preset);
    } finally {
      locked.current = false;
      setSending(false);
    }
  };
  const forget = async () => {
    if (!session || locked.current) return;
    locked.current = true;
    setLoading(true);
    try {
      await aiChatbotService.forget(session);
      setSession(null); setMessages([]);
      await retryHistory();
    } catch { setError(t('assistantErrors.close')); }
    finally { locked.current = false; setLoading(false); }
  };
  const close = async () => {
    if (!session || locked.current) return;
    locked.current = true;
    setLoading(true);
    try {
      await aiChatbotService.closeConversation(session);
      setSession(null);
      setMessages([]);
      await retryHistory();
    } catch {
      setError(t('assistantErrors.close'));
    } finally {
      locked.current = false;
      setLoading(false);
    }
  };
  const selectImage = (file?: File) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 1400000
    ) {
      setError(t('assistantErrors.image'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string" && mounted.current) {
        setImage(reader.result);
        setError("");
      }
    };
    reader.onerror = () =>
      setError(t('assistantErrors.readImage'));
    reader.readAsDataURL(file);
  };
  const enable = () => {
    if (!navigator.geolocation) {
      setError(
        t('assistantErrors.noLocation'),
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (value) => {
        if (mounted.current) {
          setPosition({
            lat: value.coords.latitude,
            lng: value.coords.longitude,
          });
          setLocating(false);
        }
      },
      () => {
        if (mounted.current) {
          setLocating(false);
          setError(
            t('assistantErrors.location'),
          );
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };
  return {
    conversation: { history, messages, session, loading, sending, error },
    composer: {
      text,
      setText,
      image,
      selectImage,
      clearImage: () => setImage(null),
    },
    actions: { send, open, start, close, forget, retryHistory },
    location: {
      enabled: !!position,
      loading: locating,
      enable,
      disable: () => setPosition(null),
    },
  };
};
