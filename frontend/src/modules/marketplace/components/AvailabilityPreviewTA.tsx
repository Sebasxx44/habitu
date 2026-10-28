import { useState } from "react";
import { useTranslation } from "react-i18next";
import { InputTA } from "@/components/TA/InputTA";
import { StateTA } from "@/components/TA/StateTA";
import { AvailabilitySlotsTA } from "@/modules/marketplace/components/AvailabilitySlotsTA";
import { AvailabilityAlertTA } from "@/modules/marketplace/components/AvailabilityAlertTA";
import { useBookingAvailability } from "@/composables/useBookingAvailability";
import { discoveryDay } from "@/modules/discovery/query";
import type { DiscoveryBusiness } from "@/modules/discovery/searchTypes";

// COMPONENT
export const AvailabilityPreviewTA = ({
  business,
  source = "marketplace",
}: {
  business: DiscoveryBusiness;
  source?: "marketplace" | "express";
}) => {
  const { t } = useTranslation("marketplace");
  const [date, setDate] = useState(
    business.next_available?.date ?? discoveryDay(),
  );
  const [serviceId, setServiceId] = useState(
    business.next_available?.service_id ?? business.service_previews[0]?.id,
  );
  const branchId =
    business.next_available?.branch_id ??
    business.main_branch?.id ??
    business.branches?.[0]?.id;
  const request =
    branchId && serviceId
      ? {
          business_id: business.id,
          branch_id: branchId,
          service_id: serviceId,
          date,
        }
      : null;
  const { availability, actions } = useBookingAvailability(request);
  const slots = availability.slots.filter((slot) => slot.available);
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <label className="block text-xs font-medium">
        {t("booking.serviceShort")}
        <select
          className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-2 text-xs"
          value={serviceId ?? ""}
          onChange={(event) => setServiceId(Number(event.target.value))}
        >
          {business.service_previews.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium">
        {t("discovery.date")}
        <InputTA
          className="mt-1"
          type="date"
          min={discoveryDay()}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      {availability.loading ? (
        <p
          role="status"
          className="py-4 text-center text-xs text-muted-foreground"
        >
          {t("booking.loading")}
        </p>
      ) : availability.error ? (
        <StateTA
          error
          title={t("booking.unavailable")}
          description={availability.error}
          onRetry={actions.reload}
        />
      ) : slots.length && branchId && serviceId ? (
        <AvailabilitySlotsTA
          slots={slots}
          context={{
            businessId: business.id,
            branchId,
            serviceId,
            date,
            source,
          }}
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {t("discovery.noSlots")}
          </p>
          <AvailabilityAlertTA request={request} />
        </>
      )}
    </div>
  );
};
