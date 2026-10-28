import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDiscoverySearch } from "@/modules/discovery/composables/useDiscoverySearch";
import {
  momentFilters,
  quickMoments,
  type QuickMoment,
} from "@/modules/marketplace/timeWindows";
import { BOOKING_TIMEZONE } from "@/i18n/formatters";
import type {
  DiscoveryFilterChange,
  DiscoverySearchState,
} from "@/modules/discovery/searchTypes";

// TYPES
export interface ExpressDiscoveryState {
  discovery: DiscoverySearchState;
  timing: { moment: QuickMoment | null; choose: (value: QuickMoment) => void };
}

// COMPOSABLE
export const useExpressDiscovery = (): ExpressDiscoveryState => {
  const [params] = useSearchParams();
  const [moment, setMoment] = useState<QuickMoment | null>(
    () =>
      quickMoments.find((value) => value === params.get("moment")) ??
      (params.has("date") ? null : "now"),
  );
  const [clock, setClock] = useState(() => new Date());
  const discovery = useDiscoverySearch();
  const { change } = discovery.filters;

  // LIFECYCLE
  useEffect(() => {
    if (moment) change(momentFilters(moment, clock, BOOKING_TIMEZONE));
  }, [moment, clock, change]);
  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  // ACTIONS
  const changeFilters = (patch: DiscoveryFilterChange) => {
    if (
      ["date", "date_to", "time_from", "time_to", "available"].some(
        (key) => key in patch,
      )
    )
      setMoment(null);
    change(patch);
  };
  const choose = (value: QuickMoment) => {
    setClock(new Date());
    setMoment(value);
  };

  // RETURN
  return {
    discovery: {
      ...discovery,
      filters: { ...discovery.filters, change: changeFilters },
    },
    timing: { moment, choose },
  };
};
