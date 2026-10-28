import { CalendarDays, Clock, MapPin, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { bookingLongDate } from "@/components/cliente/booking/BookingStepsTA";
import type {
  BookingBusiness,
  BookingFlowState,
} from "@/composables/booking/types";

// TYPES
interface BookingGuestSummaryProps {
  business: BookingBusiness;
  flow: BookingFlowState;
}

// COMPONENT
export const BookingGuestSummaryTA = ({
  business,
  flow,
}: BookingGuestSummaryProps) => {
  // COMPOSABLES
  const { t } = useTranslation("marketplace");

  // RENDER
  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-2xl border border-border bg-secondary/30 p-5">
        <p className="text-xs text-muted-foreground">
          {business.name} · {flow.journey.branch?.name}
        </p>
        <h3 className="text-xl font-semibold tracking-tight">
          {flow.journey.service?.name}
        </h3>
        <p className="flex items-start gap-2 text-sm">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="capitalize">
            {bookingLongDate(flow.selection.date)} · {flow.selection.time}
          </span>
        </p>
        <p className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            {flow.journey.branch?.address ??
              business.address ??
              t("booking.noAddress")}
          </span>
        </p>
        <p className="flex items-start gap-2 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            {t("booking.minutes", {
              count:
                flow.journey.selectedSlot?.duration_minutes ??
                flow.selection.durationMinutes,
            })}
          </span>
        </p>
      </div>
      <p
        role="status"
        className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed"
      >
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>{t("booking.accountRequired")}</span>
      </p>
    </div>
  );
};
