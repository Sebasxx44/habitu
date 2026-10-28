import { useEffect, useRef, useState } from "react";
import type {
  HomeServiceLocationState,
  HomeServicePoint,
} from "@/modules/home-service/types";

// COMPOSABLE
export const useHomeServiceLocation = (): HomeServiceLocationState => {
  // STATE
  const [point, setPoint] = useState<HomeServicePoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const generation = useRef(0);

  // LIFECYCLE
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  // ACTIONS
  const select = (next: HomeServicePoint) => {
    generation.current += 1;
    setPoint(next);
    setLatitude(String(next.lat));
    setLongitude(String(next.lng));
    setLocating(false);
    setError(null);
  };
  const locate = () => {
    if (locating) return;
    if (!navigator.geolocation) {
      setError(
        "Este navegador no permite obtener tu ubicación. Puedes marcarla en el mapa.",
      );
      return;
    }
    const current = ++generation.current;
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (current !== generation.current) return;
        setPoint({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        setLocating(false);
      },
      (failure) => {
        if (current !== generation.current) return;
        setError(
          failure.code === 1
            ? "No se concedió permiso de ubicación. Marca tu dirección en el mapa o habilita el permiso del navegador."
            : "No pudimos obtener tu ubicación. Intenta de nuevo o selecciona un punto en el mapa.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };
  const updateCoordinates = (lat: string, lng: string) => {
    generation.current += 1;
    setLatitude(lat);
    setLongitude(lng);
    setLocating(false);
    const next = { lat: Number(lat), lng: Number(lng) };
    const valid =
      lat.trim() !== "" &&
      lng.trim() !== "" &&
      Number.isFinite(next.lat) &&
      Number.isFinite(next.lng) &&
      Math.abs(next.lat) <= 90 &&
      Math.abs(next.lng) <= 180;
    setPoint(valid ? next : null);
    setError(
      valid
        ? null
        : "Completa latitud (−90 a 90) y longitud (−180 a 180) válidas.",
    );
  };

  // RETURN
  return {
    point,
    locating,
    error,
    locate,
    select,
    manual: {
      latitude,
      longitude,
      setLatitude: (value) => updateCoordinates(value, longitude),
      setLongitude: (value) => updateCoordinates(latitude, value),
    },
  };
};
