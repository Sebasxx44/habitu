import { useId } from "react";
import { CalendarRange, Check, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { formatDate } from "@/i18n/formatters";
import { analyticsToday } from "@/modules/analytics/period";
import { useDateRangeDraft } from "@/modules/analytics/composables/useDateRangeDraft";
import type {
  DateRangeFilterProps,
  DateRangePreset,
} from "@/modules/analytics/dateRangeTypes";

// CONSTANTS
const presets: { value: DateRangePreset; label: string }[] = [
  { value: "7", label: "days7" },
  { value: "30", label: "days30" },
  { value: "90", label: "days90" },
  { value: "365", label: "year" },
  { value: "custom", label: "custom" },
];

// COMPONENT
export const DateRangeFilterTA = (props: DateRangeFilterProps) => {
  // COMPOSABLES
  const { t } = useTranslation("analytics");
  const id = useId();
  const { selection, validation, actions } = useDateRangeDraft(props);
  const { draft } = selection;

  // RENDER
  return (
    <form
      aria-label={t("period")}
      className="min-w-0 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        actions.apply();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <CalendarRange
          className="mr-1 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        {presets.map((preset) => (
          <ButtonTA
            key={preset.value}
            type="button"
            size="sm"
            variant={draft.preset === preset.value ? "default" : "ghost"}
            aria-pressed={draft.preset === preset.value}
            disabled={props.disabled}
            onClick={() => selection.selectPreset(preset.value)}
          >
            {t(preset.label)}
          </ButtonTA>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label
          htmlFor={`${id}-start`}
          className="min-w-[min(100%,150px)] flex-1 space-y-1.5 text-xs font-semibold sm:max-w-[200px]"
        >
          <span>{t("start")}</span>
          <InputTA
            id={`${id}-start`}
            type="date"
            value={draft.start}
            max={props.maxDate ?? analyticsToday()}
            disabled={props.disabled}
            aria-invalid={validation.showError || undefined}
            aria-describedby={validation.showError ? `${id}-error` : undefined}
            onChange={(event) => selection.setDate("start", event.target.value)}
          />
        </label>
        <label
          htmlFor={`${id}-end`}
          className="min-w-[min(100%,150px)] flex-1 space-y-1.5 text-xs font-semibold sm:max-w-[200px]"
        >
          <span>{t("end")}</span>
          <InputTA
            id={`${id}-end`}
            type="date"
            value={draft.end}
            max={props.maxDate ?? analyticsToday()}
            disabled={props.disabled}
            aria-invalid={validation.showError || undefined}
            aria-describedby={validation.showError ? `${id}-error` : undefined}
            onChange={(event) => selection.setDate("end", event.target.value)}
          />
        </label>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <ButtonTA
            type="submit"
            disabled={props.disabled || !selection.changed}
            className="flex-1 sm:flex-none"
          >
            <Check className="size-4" />
            {t("applyRange")}
          </ButtonTA>
          {selection.changed && (
            <ButtonTA
              type="button"
              variant="outline"
              disabled={props.disabled}
              onClick={actions.reset}
            >
              <RotateCcw className="size-4" />
              {t("discardRange")}
            </ButtonTA>
          )}
        </div>
      </div>
      {validation.showError && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {t("rangeError")}
        </p>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("appliedRange", {
          start: formatDate(props.value.start, {
            dateStyle: "medium",
          }),
          end: formatDate(props.value.end, {
            dateStyle: "medium",
          }),
        })}
        {selection.changed && (
          <span className="ml-1 font-semibold text-primary">
            {t("pendingRange")}
          </span>
        )}
      </p>
    </form>
  );
};
