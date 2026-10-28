import { useTranslation } from "react-i18next";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import {
  OperationFieldTA,
  OperationSelectTA,
} from "@/modules/operations/components/OperationFieldsTA";
import { useDistribution } from "@/modules/distribution/composables/useDistribution";
import { WidgetSettingsTA } from "@/modules/distribution/components/WidgetSettingsTA";
import { BookingLinkTA } from "@/modules/distribution/components/BookingLinkTA";
import type {
  DistributionContext,
  LinkForm,
} from "@/modules/distribution/types";

// CONSTANTS
const selections: {
  field: keyof LinkForm;
  catalog: keyof Pick<
    DistributionContext,
    "services" | "resources" | "branches" | "professionals" | "promotions"
  >;
}[] = [
  { field: "service_id", catalog: "services" },
  { field: "resource_id", catalog: "resources" },
  { field: "branch_id", catalog: "branches" },
  { field: "professional_id", catalog: "professionals" },
  { field: "promo_code", catalog: "promotions" },
];
// COMPONENT
export const DistributionPage = () => {
  const { t } = useTranslation("distribution");
  const { listing, editor } = useDistribution();
  const data = listing.data;
  return (
    <div className="space-y-6 pb-8">
      <ActionHeaderTA
        title={t("title")}
        description={t("description")}
        actions={
          <ButtonTA
            variant="outline"
            disabled={listing.loading}
            onClick={listing.refresh}
          >
            {t("refresh")}
          </ButtonTA>
        }
      />
      {listing.error && (
        <StateTA
          error
          title={listing.error}
          description={t("description")}
          onRetry={listing.refresh}
        />
      )}
      {listing.loading && (
        <StateTA title={t("loading")} description={t("description")} />
      )}
      {data && (
        <>
          <OperationFieldTA label={t("business")}>
            <OperationSelectTA
              value={String(data.business_id)}
              onChange={(event) => listing.selectBusiness(event.target.value)}
            >
              {data.businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </OperationSelectTA>
          </OperationFieldTA>
          <WidgetSettingsTA
            key={data.business_id}
            data={data}
            refresh={listing.refresh}
          />
          <PanelTA title={t("create")} description={t("selectionHelp")}>
            <form
              className="space-y-4 px-5 pb-5"
              onSubmit={(event) => {
                event.preventDefault();
                void editor.create();
              }}
            >
              <OperationFieldTA label={t("label")}>
                <InputTA
                  required
                  maxLength={100}
                  value={editor.form.label}
                  onChange={(event) =>
                    editor.setField("label", event.target.value)
                  }
                />
              </OperationFieldTA>
              <div className="grid gap-4 sm:grid-cols-2">
                {selections.map(({ field, catalog }) => (
                  <OperationFieldTA key={field} label={t(catalog)}>
                    <OperationSelectTA
                      value={editor.form[field]}
                      onChange={(event) =>
                        editor.setField(field, event.target.value)
                      }
                    >
                      <option value="">{t("noSelection")}</option>
                      {data[catalog].map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </OperationSelectTA>
                  </OperationFieldTA>
                ))}
              </div>
              <ButtonTA type="submit" disabled={editor.busy}>
                {t("create")}
              </ButtonTA>
            </form>
          </PanelTA>
          {editor.error && (
            <p role="alert" className="text-sm text-destructive">
              {editor.error}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t("measurementHelp")}
          </p>
          {data.links.map((link) => (
            <BookingLinkTA
              key={link.id}
              link={link}
              remove={() => {
                void editor.remove(link.id);
              }}
              busy={editor.busy}
            />
          ))}
        </>
      )}
    </div>
  );
};
