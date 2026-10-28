import { useEffect, useRef, useState } from "react";
import type {
  VoiceRecognition,
  VoiceRecognitionConstructor,
  VoiceSearchState,
} from "@/modules/discovery/types";

// COMPOSABLE
export const useVoiceSearch = (): VoiceSearchState => {
  // STATE
  const browser = window as Window & {
    SpeechRecognition?: VoiceRecognitionConstructor;
    webkitSpeechRecognition?: VoiceRecognitionConstructor;
  };
  const Recognition =
    browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  const recognition = useRef<VoiceRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  // EFFECTS
  useEffect(
    () => () => {
      if (recognition.current) {
        recognition.current.onend = null;
        recognition.current.onerror = null;
        recognition.current.onresult = null;
        recognition.current.abort();
      }
    },
    [],
  );

  // ACTIONS
  const start = () => {
    if (!Recognition || listening) return;
    const current = new Recognition();
    current.lang = "es-CO";
    current.interimResults = true;
    current.continuous = false;
    current.onresult = (event) => {
      const parts: string[] = [];
      for (let index = 0; index < event.results.length; index++)
        parts.push(event.results[index][0].transcript);
      setTranscript(parts.join(" ").trim());
    };
    current.onerror = (event) => {
      setListening(false);
      setError(
        event.error === "not-allowed"
          ? "No se autorizó el micrófono. Puedes escribir tu búsqueda."
          : "No pudimos transcribir el audio. Intenta de nuevo o escribe tu búsqueda.",
      );
    };
    current.onend = () => setListening(false);
    recognition.current = current;
    setError("");
    try {
      current.start();
      setListening(true);
    } catch {
      setError("El micrófono no está disponible. Puedes escribir tu búsqueda.");
    }
  };
  const stop = () => {
    recognition.current?.stop();
    setListening(false);
  };
  return {
    voice: { supported: !!Recognition, listening, error, transcript },
    actions: { start, stop, edit: setTranscript },
  };
};
