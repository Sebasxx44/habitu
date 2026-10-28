import { useTranslation } from "react-i18next";
import { PanelTA } from "@/components/TA/PanelTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { TextareaTA } from "@/modules/benefits/components/TextareaTA";
import { usePaymentPolicyEditor } from "@/modules/checkout/usePaymentPolicyEditor";
import type { ReservationPaymentMode } from "@/modules/checkout/types";

// COMPONENT
export const PaymentPolicyEditorTA = ({
  businessId,
}: {
  businessId: number;
}) => {
  const { t } = useTranslation("checkout");
  const { form, status, save } = usePaymentPolicyEditor(businessId);
  const modes: ReservationPaymentMode[] = ["FULL", "DEPOSIT", "ON_SITE"];
  return (
    <PanelTA title={t("policyTitle")} description={t("policyDescription")}>
      <form
        className="space-y-4 px-5 pb-5"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {status.loading ? (
          <p role="status">{t("loadingPolicy")}</p>
        ) : (
          <>
            {!status.online && (
              <p className="text-xs text-muted-foreground">
                {t("providerDisabled")}
              </p>
            )}
            <div className="flex flex-wrap gap-4">
              {modes.map((mode) => (
                <label key={mode} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.modes.includes(mode)}
                    onChange={() => form.toggle(mode)}
                  />
                  {t(`modes.${mode}`)}
                </label>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {form.modes.includes("DEPOSIT") && (
                <label className="block space-y-2 text-sm">
                  {t("deposit")}
                  <InputTA
                    type="number"
                    required
                    min={1}
                    max={99}
                    value={form.deposit}
                    onChange={(event) =>
                      form.setDeposit(Number(event.target.value))
                    }
                  />
                </label>
              )}
              <label className="block space-y-2 text-sm">
                {t("holdMinutes")}
                <InputTA
                  type="number"
                  required
                  min={5}
                  max={30}
                  value={form.minutes}
                  onChange={(event) =>
                    form.setMinutes(Number(event.target.value))
                  }
                />
              </label>
            </div>
            <label className="block space-y-2 text-sm">
              {t("terms")}
              <TextareaTA
                required
                rows={4}
                minLength={10}
                maxLength={3000}
                value={form.terms}
                onChange={(event) => form.setTerms(event.target.value)}
              />
            </label>
            <ButtonTA
              type="submit"
              disabled={status.busy || form.modes.length === 0}
            >
              {t("save")}
            </ButtonTA>
          </>
        )}
        {status.error && (
          <p role="alert" className="text-sm text-destructive">
            {t("error")}
          </p>
        )}
        {status.saved && (
          <p role="status" className="text-sm text-primary">
            {t("saved")}
          </p>
        )}
      </form>
    </PanelTA>
  );
};
