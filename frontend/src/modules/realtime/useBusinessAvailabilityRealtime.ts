import { useEffect } from "react";
import { subscribeRealtime } from "@/modules/realtime/connection";
import { publishResourceChange } from "@/modules/realtime/resourceBus";

// COMPOSABLE
export const useBusinessAvailabilityRealtime = (businessId?: number): void => {
  useEffect(() => {
    if (!businessId || !Number.isSafeInteger(businessId)) return;
    return subscribeRealtime(
      `availability.${businessId}`,
      ".resource.changed",
      (payload) => {
        publishResourceChange({
          topics: ["availability"],
          revision:
            typeof payload.revision === "string" ? payload.revision : undefined,
        });
      },
      false,
    );
  }, [businessId]);
};
