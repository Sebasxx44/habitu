import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import {
  OperationFieldTA,
  OperationSelectTA,
} from "@/modules/operations/components/OperationFieldsTA";
import { useHealthFeatureFlags } from "@/modules/analytics/health/useHealthFeatureFlags";
import type {
  HealthFeatureScope,
  HealthFeatureState,
} from "@/modules/analytics/health/types";

// CONSTANTS
const scopes: HealthFeatureScope[] = ["global", "business", "category"];
const states: HealthFeatureState[] = ["inherit", "enabled", "disabled"];

// COMPONENT
export const HealthFeatureFlagsTA = ({
  businessId,
}: {
  businessId: number;
}) => {
  // COMPOSABLES
  const { t } = useTranslation("health");
  const { selection, form, request } = useHealthFeatureFlags(businessId);
  // RENDER
  return (
    <section className="space-y-3 border-t border-border pt-5">
      <h3 className="font-semibold">{t("featuresTitle")}</h3>
      <p className="text-sm text-muted-foreground">
        {t("featuresDescription")}
      </p>
      <form onSubmit={form.submit}>
        <fieldset
          disabled={request.busy || request.loading}
          className="grid gap-4 sm:grid-cols-2"
        >
          <OperationFieldTA label={t("feature")}>
            <OperationSelectTA
              value={selection.flag}
              onChange={(event) => {
                const next = selection.flags.find(
                  (item) => item.name === event.target.value,
                )?.name;
                if (next) selection.setFlag(next);
              }}
            >
              {selection.flags.map((item) => (
                <option key={item.name} value={item.name}>
                  {t(`features.${item.name}`)}
                </option>
              ))}
            </OperationSelectTA>
          </OperationFieldTA>
          <OperationFieldTA label={t("scope")}>
            <OperationSelectTA
              value={selection.scope}
              onChange={(event) => {
                const next = scopes.find((item) => item === event.target.value);
                if (next) selection.setScope(next);
              }}
            >
              {scopes.map((item) => (
                <option key={item} value={item}>
                  {t(`scopes.${item}`)}
                </option>
              ))}
            </OperationSelectTA>
          </OperationFieldTA>
          {selection.scope === "business" && (
            <p className="text-sm text-muted-foreground">
              {businessId
                ? t("selectedBusinessScope", { id: businessId })
                : t("selectBusiness")}
            </p>
          )}
          {selection.scope === "category" && (
            <OperationFieldTA label={t("category")}>
              <OperationSelectTA
                value={selection.categoryId || ""}
                onChange={(event) =>
                  selection.setCategoryId(Number(event.target.value))
                }
                required
              >
                <option value="">{t("selectCategory")}</option>
                {selection.categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </OperationSelectTA>
            </OperationFieldTA>
          )}
          <OperationFieldTA label={t("featureState")}>
            <OperationSelectTA
              value={form.state}
              onChange={(event) => {
                const next = states.find((item) => item === event.target.value);
                if (next) form.setState(next);
              }}
            >
              {states
                .filter(
                  (item) => item !== "inherit" || selection.scope !== "global",
                )
                .map((item) => (
                  <option key={item} value={item}>
                    {t(`states.${item}`)}
                  </option>
                ))}
            </OperationSelectTA>
          </OperationFieldTA>
          {selection.scope === "global" && (
            <OperationFieldTA label={t("percentage")}>
              <InputTA
                type="number"
                min={0}
                max={100}
                step={1}
                required
                value={form.percentage}
                onChange={(event) =>
                  form.setPercentage(Number(event.target.value))
                }
              />
            </OperationFieldTA>
          )}
          <OperationFieldTA label={t("featureReason")}>
            <InputTA
              required
              minLength={8}
              maxLength={500}
              value={form.reason}
              onChange={(event) => form.setReason(event.target.value)}
            />
          </OperationFieldTA>
          <ButtonTA type="submit" disabled={!form.available}>
            {t("saveFeature")}
          </ButtonTA>
        </fieldset>
      </form>
      {form.selected && (
        <p className="text-sm text-muted-foreground">
          {t("globalFeatureState", {
            state: t(
              `states.${form.selected.enabled ? "enabled" : "disabled"}`,
            ),
            percentage: form.selected.user_percentage,
          })}
        </p>
      )}
      {request.error && (
        <p role="alert" className="text-sm text-destructive">
          {t("error")}
        </p>
      )}
      {request.saved && (
        <p role="status" className="text-sm text-primary">
          {t("featureSaved")}
        </p>
      )}
    </section>
  );
};
