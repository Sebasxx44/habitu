import i18n from "@/i18n";
import { useState } from "react";
import type { Service } from "@/types/models";
import type {
  BookingModel,
  BookingPolicy,
  BookingPolicyState,
} from "@/modules/services/bookingPolicyTypes";

// DEFAULTS
const initial = (
  service?: Service,
  defaultModel: BookingModel = "professional",
): BookingPolicy => ({
  booking_model:
    service?.booking_model ??
    (service?.requires_professional === false ? defaultModel : "professional"),
  duration_mode: service?.duration_mode ?? "fixed",
  duration_options: service?.duration_options ?? [],
  booking_capacity: service?.booking_capacity ?? 1,
  min_advance_minutes: service?.min_advance_minutes ?? 0,
  max_advance_days: service?.max_advance_days === null ? null : service?.max_advance_days ?? 180,
  slot_interval_minutes: service?.slot_interval_minutes ?? 15,
  buffer_minutes: service?.buffer_minutes ?? 0,
  requires_confirmation: service?.requires_confirmation ?? true,
  allow_cancellation: service?.allow_cancellation ?? true,
  allow_reschedule: service?.allow_reschedule ?? true,
  cancellation_notice_minutes: service?.cancellation_notice_minutes ?? 0,
  reschedule_notice_minutes: service?.reschedule_notice_minutes ?? 0,
  resource_professional_optional:
    service?.resource_professional_optional ?? false,
  resource_ids: service?.resources?.map((resource) => resource.id) ?? [],
});

// COMPOSABLE
export const useBookingPolicy = (): BookingPolicyState => {
  const [value, setValue] = useState<BookingPolicy>(() => initial());
  const [durations, setDurations] = useState("");
  const field = <K extends keyof BookingPolicy>(
    key: K,
    fieldValue: BookingPolicy[K],
  ) => setValue((current) => ({ ...current, [key]: fieldValue }));
  const reset = (
    service?: Service,
    defaultModel: BookingModel = "professional",
  ) => {
    const next = initial(service, defaultModel);
    if (!service) next.booking_model = defaultModel;
    setValue(next);
    setDurations(next.duration_options.join(", "));
  };
  const payload = (baseDuration: number): BookingPolicy => {
    const options = durations.split(",").map((item) => Number(item.trim()));
    if (
      value.duration_mode === "selectable" &&
      options.some(
        (item) => !Number.isSafeInteger(item) || item < 1 || item > 1440,
      )
    )
      throw new Error(i18n.t("serviceAdmin.invalidDurations"));
    return {
      ...value,
      duration_options:
        value.duration_mode === "selectable"
          ? [...new Set(options)]
          : [baseDuration],
      resource_professional_optional:
        value.booking_model === "resource" &&
        value.resource_professional_optional,
    };
  };
  return {
    form: { value, durations },
    actions: { field, durations: setDurations, reset, payload },
  };
};
