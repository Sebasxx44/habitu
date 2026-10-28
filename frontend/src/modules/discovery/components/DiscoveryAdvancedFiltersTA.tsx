import { useTranslation } from "react-i18next";
import { InputTA } from "@/components/TA/InputTA";
import type { FilterDraftState } from "@/modules/discovery/filters/types";

// CONFIGURATION
const selectClass =
  "min-h-11 w-full rounded-xl border border-input bg-background px-3 text-base";

// COMPONENT
export const DiscoveryAdvancedFiltersTA = ({
  draft,
}: {
  draft: FilterDraftState["draft"];
}) => {
  // COMPOSABLES
  const { t } = useTranslation("marketplace");
  const { t: ui } = useTranslation("discoveryUi");
  const { values, change } = draft;

  // RENDER
  return (
    <div className="mt-4 space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {ui("advancedDescription")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-xs font-medium">
          {t("adminService.model")}
          <select
            value={values.booking_model}
            onChange={(event) => change({ booking_model: event.target.value })}
            className={selectClass}
          >
            <option value="">{t("discovery.all")}</option>
            {(
              [
                "professional",
                "resource",
                "direct",
                "optional_professional",
                "capacity",
              ] as const
            ).map((model) => (
              <option key={model} value={model}>
                {t(`adminService.${model}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2 text-xs font-medium">
          {t("discovery.duration")}
          <InputTA
            type="number"
            min={5}
            max={1440}
            step={5}
            className="min-w-0 bg-background text-base"
            value={values.duration_minutes}
            onChange={(event) =>
              change({
                duration_minutes: event.target.value,
                available: event.target.value
                  ? "1"
                  : values.date || values.time_from || values.time_to
                    ? "1"
                    : "",
              })
            }
          />
        </label>
        <label className="block space-y-2 text-xs font-medium">
          {t("discovery.sport")}
          <select
            value={values.sport_type}
            onChange={(event) => change({ sport_type: event.target.value })}
            className={selectClass}
          >
            <option value="">{t("discovery.all")}</option>
            {["football_5", "football_7", "football_11", "tennis", "padel"].map(
              (sport) => (
                <option key={sport} value={sport}>
                  {t(`discovery.${sport}`)}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="block space-y-2 text-xs font-medium">
          {t("discovery.surface")}
          <select
            value={values.surface}
            onChange={(event) => change({ surface: event.target.value })}
            className={selectClass}
          >
            <option value="">{t("discovery.all")}</option>
            <option value="synthetic">{t("discovery.synthetic")}</option>
            <option value="natural">{t("discovery.natural")}</option>
          </select>
        </label>
        <label className="block space-y-2 text-xs font-medium">
          {t("discovery.resourceType")}
          <select
            value={values.covered}
            onChange={(event) => change({ covered: event.target.value })}
            className={selectClass}
          >
            <option value="">{t("discovery.all")}</option>
            <option value="1">{t("discovery.covered")}</option>
            <option value="0">{t("discovery.outdoor")}</option>
          </select>
        </label>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {ui("suggestionHelp")}
      </p>
    </div>
  );
};
