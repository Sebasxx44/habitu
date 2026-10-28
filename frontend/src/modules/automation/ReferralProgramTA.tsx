import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { TextareaTA } from "@/modules/benefits/components/TextareaTA";
import { useReferralProgram } from "@/modules/automation/useReferralProgram";

// COMPONENT
export const ReferralProgramTA = ({ businessId }: { businessId: number }) => {
  // COMPOSABLES
  const { t } = useTranslation("automation");
  const { form, request } = useReferralProgram(businessId, "COP");
  // RENDER
  return (
    <PanelTA title={t("referrals")} description={t("referralDescription")}>
      <form
        className="space-y-4 px-5 pb-5"
        onSubmit={(event) => {
          event.preventDefault();
          void form.save();
        }}
      >
        <ButtonTA
          type="button"
          variant="outline"
          aria-pressed={form.value.enabled}
          onClick={() =>
            form.setValue((current) => ({
              ...current,
              enabled: !current.enabled,
            }))
          }
        >
          {t(form.value.enabled ? "enabled" : "disabled")}
        </ButtonTA>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            {t("reward")} ({form.value.currency})
            <InputTA
              type="number"
              min={0}
              max={1000000}
              step="0.01"
              required
              value={form.value.reward}
              onChange={(event) =>
                form.setValue((current) => ({
                  ...current,
                  reward: Number(event.target.value),
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            {t("minimumPaid")} ({form.value.currency})
            <InputTA
              type="number"
              min={0}
              step="0.01"
              required
              value={form.value.minimum_paid}
              onChange={(event) =>
                form.setValue((current) => ({
                  ...current,
                  minimum_paid: Number(event.target.value),
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            {t("validity")}
            <InputTA
              type="number"
              min={1}
              max={180}
              required
              value={form.value.validity_days}
              onChange={(event) =>
                form.setValue((current) => ({
                  ...current,
                  validity_days: Number(event.target.value),
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            {t("qualification")}
            <InputTA
              type="number"
              min={1}
              max={90}
              required
              value={form.value.qualification_days}
              onChange={(event) =>
                form.setValue((current) => ({
                  ...current,
                  qualification_days: Number(event.target.value),
                }))
              }
            />
          </label>
        </div>
        <label className="block space-y-2 text-sm">
          {t("terms")}
          <TextareaTA
            required
            minLength={10}
            maxLength={2000}
            value={form.value.terms}
            onChange={(event) =>
              form.setValue((current) => ({
                ...current,
                terms: event.target.value,
              }))
            }
          />
        </label>
        {request.error && (
          <p role="alert" className="text-sm text-destructive">
            {t("error")}
          </p>
        )}
        {request.saved && (
          <p role="status" className="text-sm">
            {t("saved")}
          </p>
        )}
        <ButtonTA type="submit" disabled={request.busy || request.loading}>
          {t("save")}
        </ButtonTA>
      </form>
    </PanelTA>
  );
};
