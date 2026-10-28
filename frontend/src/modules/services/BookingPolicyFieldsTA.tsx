import { useTranslation } from "react-i18next";
import type {
  BookingModel,
  BookingPolicy,
  BookingPolicyFieldsProps,
} from "@/modules/services/bookingPolicyTypes";

// CONFIGURATION
const models: BookingModel[] = [
  "professional",
  "resource",
  "direct",
  "optional_professional",
  "capacity",
];
const numeric: {
  key: keyof Pick<
    BookingPolicy,
    | "min_advance_minutes"
    | "slot_interval_minutes"
    | "buffer_minutes"
    | "cancellation_notice_minutes"
    | "reschedule_notice_minutes"
  >;
  label: string;
  min: number;
  max: number;
}[] = [
  { key: "min_advance_minutes", label: "minAdvance", min: 0, max: 525600 },
  { key: "slot_interval_minutes", label: "interval", min: 1, max: 720 },
  { key: "buffer_minutes", label: "buffer", min: 0, max: 720 },
  {
    key: "cancellation_notice_minutes",
    label: "cancelNotice",
    min: 0,
    max: 525600,
  },
  {
    key: "reschedule_notice_minutes",
    label: "rescheduleNotice",
    min: 0,
    max: 525600,
  },
];
const toggles: {
  key: keyof Pick<
    BookingPolicy,
    "requires_confirmation" | "allow_cancellation" | "allow_reschedule"
  >;
  label: string;
}[] = [
  { key: "requires_confirmation", label: "confirmation" },
  { key: "allow_cancellation", label: "cancellation" },
  { key: "allow_reschedule", label: "reschedule" },
];
const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm";

// COMPONENT
export const BookingPolicyFieldsTA = ({
  policy,
  resources,
  disabled,
}: BookingPolicyFieldsProps) => {
  const { t } = useTranslation("marketplace");
  const { value, durations } = policy.form;
  return (
    <fieldset
      disabled={disabled}
      className="space-y-5 rounded-2xl border border-border bg-secondary/20 p-5"
    >
      <legend className="px-2 text-base font-semibold">
        {t("adminService.title")}
      </legend>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium">
          {t("adminService.model")}
          <select
            className={inputClass}
            value={value.booking_model}
            onChange={(event) => {
              const next = models.find((model) => model === event.target.value);
              if (next) policy.actions.field("booking_model", next);
            }}
          >
            {models.map((model) => (
              <option value={model} key={model}>
                {t(`adminService.${model}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          {t("adminService.durationMode")}
          <select
            className={inputClass}
            value={value.duration_mode}
            onChange={(event) =>
              policy.actions.field(
                "duration_mode",
                event.target.value === "selectable" ? "selectable" : "fixed",
              )
            }
          >
            <option value="fixed">{t("adminService.fixed")}</option>
            <option value="selectable">{t("adminService.selectable")}</option>
          </select>
        </label>
        {value.duration_mode === "selectable" && (
          <label className="text-sm font-medium sm:col-span-2">
            {t("adminService.durations")}
            <input
              className={inputClass}
              inputMode="numeric"
              value={durations}
              onChange={(event) => policy.actions.durations(event.target.value)}
              placeholder="60, 120, 180"
            />
          </label>
        )}
        {value.booking_model === "capacity" && (
          <label className="text-sm font-medium">
            {t("adminService.capacityLabel")}
            <input
              className={inputClass}
              type="number"
              min={1}
              max={10000}
              value={value.booking_capacity}
              onChange={(event) =>
                policy.actions.field(
                  "booking_capacity",
                  Number(event.target.value),
                )
              }
            />
          </label>
        )}
        {numeric.map((field) => (
          <label key={field.key} className="text-sm font-medium">
            {t(`adminService.${field.label}`)}
            <input
              type="number"
              min={field.min}
              max={field.max}
              className={inputClass}
              value={value[field.key]}
              onChange={(event) =>
                policy.actions.field(field.key, Number(event.target.value))
              }
            />
          </label>
        ))}
        <label className="text-sm font-medium">
          {t("adminService.maxAdvance")}
          <input
            type="number"
            min={1}
            max={730}
            className={inputClass}
            value={value.max_advance_days ?? ""}
            onChange={(event) =>
              policy.actions.field(
                "max_advance_days",
                event.target.value ? Number(event.target.value) : null,
              )
            }
          />
        </label>
      </div>
      <div className="grid gap-3">
        {toggles.map((field) => (
          <label
            key={field.key}
            className="flex min-h-11 items-center gap-3 text-sm"
          >
            <input
              type="checkbox"
              checked={value[field.key]}
              onChange={(event) =>
                policy.actions.field(field.key, event.target.checked)
              }
              className="size-4"
            />
            {t(`adminService.${field.label}`)}
          </label>
        ))}
        {value.booking_model === "resource" && (
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={value.resource_professional_optional}
              onChange={(event) =>
                policy.actions.field(
                  "resource_professional_optional",
                  event.target.checked,
                )
              }
              className="size-4"
            />
            {t("adminService.optionalProfessional")}
          </label>
        )}
      </div>
      {(value.booking_model === "resource" ||
        value.booking_model === "capacity") && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">
            {t("adminService.resources")}
          </legend>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("adminService.resourcesHint")}
          </p>
          {resources.map((resource) => (
            <label
              key={resource.id}
              className="flex min-h-11 items-center gap-3 text-sm"
            >
              <input
                type="checkbox"
                checked={value.resource_ids.includes(resource.id)}
                onChange={(event) =>
                  policy.actions.field(
                    "resource_ids",
                    event.target.checked
                      ? [...value.resource_ids, resource.id]
                      : value.resource_ids.filter((id) => id !== resource.id),
                  )
                }
                className="size-4"
              />
              {resource.name}
            </label>
          ))}
        </fieldset>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("adminService.pricing")}
      </p>
    </fieldset>
  );
};
