import { Link } from "react-router-dom";
import { formatTime } from "@/i18n/formatters";
import {
  slotBookingLink,
  type BookingLinkContext,
} from "@/modules/marketplace/bookingLinks";
import { trackMarketplaceEvent } from "@/modules/analytics/tracking";
import type { BookingSlot } from "@/composables/booking/types";

// COMPONENT
export const AvailabilitySlotsTA = ({
  slots,
  context,
}: {
  slots: BookingSlot[];
  context: BookingLinkContext;
}) => (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
    {slots
      .filter((slot) => slot.available)
      .slice(0, 6)
      .map((slot) => (
        <Link
          key={`${slot.start_time}:${slot.professional_id ?? ""}:${slot.resource_id ?? ""}`}
          to={slotBookingLink(context, slot)}
          onClick={() => {
            if (context.source === "assistant")
              void trackMarketplaceEvent("assistant_click", {
                source: "assistant",
                business_id: context.businessId,
                service_id: context.serviceId,
              });
          }}
          className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-primary/25 px-2 py-2 text-center text-xs font-semibold text-primary transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span>{formatTime(slot.start_time)}</span>
          {(slot.resource_name || slot.professional_name) && (
            <span className="max-w-full truncate text-[10px] font-normal text-muted-foreground">
              {slot.resource_name || slot.professional_name}
            </span>
          )}
        </Link>
      ))}
  </div>
);
