import { useRef, useState, useEffect } from "react";
import type {
  DiscoverySearchState,
  DiscoveryFilters,
  DiscoveryFilterChange,
} from "@/modules/discovery/searchTypes";

// COMPOSABLE
export const useDiscoveryLocation = (
  filters: DiscoveryFilters,
  change: (values: DiscoveryFilterChange) => void,
): DiscoverySearchState["location"] => {
  // STATE
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  // ACTIONS
  const locate = () => {
    if (!navigator.geolocation) {
      setError("Tu navegador no ofrece ubicación. Busca por zona o dirección.");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active.current) return;
        change({
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
          zone: "",
          sort: "distance",
        });
        setLoading(false);
      },
      () => {
        if (!active.current) return;
        setLoading(false);
        setError(
          "No pudimos obtener tu ubicación. Puedes explorar sin ella o escribir una zona.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };
  const point =
    filters.lat &&
    filters.lng &&
    Number.isFinite(Number(filters.lat)) &&
    Number.isFinite(Number(filters.lng))
      ? { lat: Number(filters.lat), lng: Number(filters.lng) }
      : null;
  return {
    point,
    loading,
    error,
    locate,
    clear: () => {
      change({ lat: "", lng: "", sort: "recommended" });
      setError("");
    },
  };
};
