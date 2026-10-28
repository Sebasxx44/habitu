import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import {
  OperationFieldTA,
  OperationSelectTA,
} from "@/modules/operations/components/OperationFieldsTA";
import { HealthFeatureFlagsTA } from "@/modules/analytics/health/HealthFeatureFlagsTA";
import { useHealthClassifications } from "@/modules/analytics/health/useHealthClassifications";
import type { AnalyticsEnvironment } from "@/modules/analytics/health/types";

// CONSTANTS
const environments: AnalyticsEnvironment[] = [
  "UNCLASSIFIED",
  "PRODUCTION",
  "DEMO",
  "TEST",
];

// COMPONENT
export const HealthClassificationTA = ({
  refresh,
}: {
  refresh: () => void;
}) => {
  // COMPOSABLES
  const { t } = useTranslation("health");
  const { list, form, request } = useHealthClassifications(refresh);
  // RENDER
  return (
    <PanelTA
      title={t("classificationTitle")}
      description={t("classificationDescription")}
    >
      <div className="space-y-4 px-5 pb-5">
        <OperationFieldTA label={t("searchBusiness")}>
          <InputTA
            value={list.search}
            onChange={(event) => list.setSearch(event.target.value)}
          />
        </OperationFieldTA>
        <form onSubmit={form.submit}>
          <fieldset
            disabled={request.busy || request.loading}
            className="grid gap-4 sm:grid-cols-2"
          >
            <OperationFieldTA label={t("business")}>
              <OperationSelectTA
                required
                value={form.id || ""}
                onChange={(event) => form.select(Number(event.target.value))}
              >
                <option value="">{t("selectBusiness")}</option>
                {list.businesses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ·{" "}
                    {t(`environments.${item.analytics_environment}`)}
                  </option>
                ))}
              </OperationSelectTA>
            </OperationFieldTA>
            <OperationFieldTA label={t("classification")}>
              <OperationSelectTA
                value={form.environment}
                onChange={(event) => {
                  const value = environments.find(
                    (item) => item === event.target.value,
                  );
                  if (value) form.setEnvironment(value);
                }}
              >
                {environments.map((value) => (
                  <option key={value} value={value}>
                    {t(`environments.${value}`)}
                  </option>
                ))}
              </OperationSelectTA>
            </OperationFieldTA>
            <OperationFieldTA label={t("reason")}>
              <InputTA
                required
                minLength={8}
                maxLength={500}
                value={form.reason}
                onChange={(event) => form.setReason(event.target.value)}
              />
            </OperationFieldTA>
            <ButtonTA type="submit" disabled={!form.id}>
              {t("classify")}
            </ButtonTA>
          </fieldset>
        </form>
        <div className="flex gap-2">
          <ButtonTA
            variant="outline"
            disabled={list.page <= 1 || request.loading}
            onClick={() => list.setPage(list.page - 1)}
          >
            {t("previous")}
          </ButtonTA>
          <span className="self-center text-sm">
            {list.page} / {list.lastPage}
          </span>
          <ButtonTA
            variant="outline"
            disabled={list.page >= list.lastPage || request.loading}
            onClick={() => list.setPage(list.page + 1)}
          >
            {t("next")}
          </ButtonTA>
        </div>
        {request.error && (
          <p role="alert" className="text-sm text-destructive">
            {t("error")}
          </p>
        )}
        {request.saved && (
          <p role="status" className="text-sm text-primary">
            {t("classificationSaved")}
          </p>
        )}
        <HealthFeatureFlagsTA businessId={form.id} />
      </div>
    </PanelTA>
  );
};
