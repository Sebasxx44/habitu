import { useEffect, useRef, useState } from "react";
import { trackingService } from "@/services/ondemand/ondemandService";
import { homeServiceDistance } from "@/modules/home-service/helpers";
import type {
  HomeServicePoint,
  ProfessionalLocationState,
} from "@/modules/home-service/types";

// COMPOSABLE
export const useProfessionalLocation = (): ProfessionalLocationState => {
  // STATE
  const [enabled, setEnabled] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  // LIFECYCLE
  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setError(
        "Este navegador no admite ubicación. Usa un dispositivo compatible para compartirla.",
      );
      setEnabled(false);
      return;
    }
    let disposed = false;
    let watcher: number | null = null;
    let lastPoint: HomeServicePoint | null = null;
    let lastTimestamp = 0;
    const send = async (position: GeolocationPosition) => {
      if (disposed || document.visibilityState !== "visible" || pending.current)
        return;
      const point = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      const elapsed = Date.now() - lastTimestamp;
      if (
        elapsed < 15000 ||
        (lastPoint &&
          homeServiceDistance(lastPoint, point) < 0.025 &&
          elapsed < 60000)
      )
        return;
      pending.current = true;
      setSending(true);
      try {
        await trackingService.updateLocation({
          ...point,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed ?? undefined,
          heading: position.coords.heading ?? undefined,
        });
        lastPoint = point;
        lastTimestamp = Date.now();
        if (!disposed) {
          setLastSentAt(new Date());
          setError(null);
        }
      } catch {
        if (!disposed) {
          setError(
            "No pudimos compartir tu ubicación. Revisa tu conexión y los permisos para volver a activarla.",
          );
          setEnabled(false);
        }
      } finally {
        pending.current = false;
        if (!disposed) setSending(false);
      }
    };
    const stop = () => {
      if (watcher !== null) navigator.geolocation.clearWatch(watcher);
      watcher = null;
    };
    const start = () => {
      stop();
      if (document.visibilityState !== "visible") return;
      watcher = navigator.geolocation.watchPosition(
        (position) => {
          void send(position);
        },
        () => {
          if (!disposed) {
            setError(
              "No se pudo acceder a tu ubicación. Revisa los permisos del navegador.",
            );
            setEnabled(false);
          }
        },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 },
      );
    };
    setError(null);
    start();
    document.addEventListener("visibilitychange", start);
    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", start);
      setSending(false);
    };
  }, [enabled]);

  // RETURN
  return { enabled, sending, lastSentAt, error, setEnabled };
};
