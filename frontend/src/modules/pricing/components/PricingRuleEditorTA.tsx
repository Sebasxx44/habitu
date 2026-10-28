import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import type {
  PricingContext,
  PricingRule,
  PricingRuleInput,
  PricingRulesState,
} from "@/modules/pricing/types";
// COMPONENT
export const PricingRuleEditorTA = ({
  context,
  rule,
  mutations,
  onClose,
}: {
  context: PricingContext;
  rule: PricingRule | null;
  mutations: PricingRulesState["mutations"];
  onClose: () => void;
}) => {
  const { t } = useTranslation("pricing");
  // STATE
  const [form, setForm] = useState<PricingRuleInput>(() => ({
    business_id: context.business?.id ?? 0,
    service_id: rule?.service_id ?? null,
    name: rule?.name ?? "",
    rule_type: rule?.rule_type === "DAY_OF_WEEK" ? "DAY_OF_WEEK" : "PEAK_HOUR",
    conditions: rule?.conditions ?? {
      days_of_week: [1, 2, 3, 4, 5],
      time_start: "09:00",
      time_end: "12:00",
    },
    multiplier: rule?.multiplier ?? 1,
    flat_adjustment: rule?.flat_adjustment ?? 0,
    priority: rule?.priority ?? 10,
    is_active: rule?.is_active ?? false,
    starts_at: rule?.starts_at ?? null,
    ends_at: rule?.ends_at ?? null,
  }));
  const update = <K extends keyof PricingRuleInput>(
    key: K,
    value: PricingRuleInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  // RENDER
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutations.busy) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle>{t(rule ? "edit" : "add")}</DialogTitle>
        <DialogDescription>
          {context.business?.name} · {context.timezone}
        </DialogDescription>
        <form
          className="mt-6 space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await mutations.save(form, rule?.id)) onClose();
          }}
        >
          <label className="block space-y-2 text-sm font-medium">
            {t("name")}
            <InputTA
              required
              maxLength={100}
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            {t("service")}
            <select
              className="min-h-11 w-full rounded-xl border border-input bg-background px-3"
              value={form.service_id ?? ""}
              onChange={(event) =>
                update(
                  "service_id",
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            >
              <option value="">{t("allServices")}</option>
              {context.business?.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="mb-3 text-sm font-medium">{t("days")}</legend>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <ButtonTA
                  key={day}
                  type="button"
                  variant={
                    form.conditions.days_of_week.includes(day)
                      ? "secondary"
                      : "outline"
                  }
                  aria-pressed={form.conditions.days_of_week.includes(day)}
                  onClick={() =>
                    update("conditions", {
                      ...form.conditions,
                      days_of_week: form.conditions.days_of_week.includes(day)
                        ? form.conditions.days_of_week.filter(
                            (value) => value !== day,
                          )
                        : [...form.conditions.days_of_week, day],
                    })
                  }
                >
                  {t(`weekdays.${day}`)}
                </ButtonTA>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-4">
            {(["time_start", "time_end"] as const).map((key, index) => (
              <label key={key} className="space-y-2 text-sm font-medium">
                {t(index ? "ends" : "starts")}
                <InputTA
                  type="time"
                  required
                  value={form.conditions[key]}
                  onChange={(event) =>
                    update("conditions", {
                      ...form.conditions,
                      [key]: event.target.value,
                    })
                  }
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t("endExclusive")}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm font-medium">
              {t("multiplier")}
              <InputTA
                required
                type="number"
                min={0.1}
                max={5}
                step={0.01}
                value={form.multiplier}
                onChange={(event) =>
                  update("multiplier", Number(event.target.value))
                }
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              {t("adjustment")} · {context.currency}
              <InputTA
                required
                type="number"
                min={-99999999}
                max={99999999}
                step={0.01}
                value={form.flat_adjustment}
                onChange={(event) =>
                  update("flat_adjustment", Number(event.target.value))
                }
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              {t("priority")}
              <InputTA
                required
                type="number"
                min={0}
                max={10000}
                step={1}
                value={form.priority}
                onChange={(event) =>
                  update("priority", Number(event.target.value))
                }
              />
            </label>
          </div>
          <p className="rounded-xl bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground">
            {t("formula")} {t("priorityHelp")}
          </p>
          <fieldset>
            <legend className="mb-3 text-sm font-medium">
              {t("validity")}
            </legend>
            <div className="grid grid-cols-2 gap-4">
              {(["starts_at", "ends_at"] as const).map((key, index) => (
                <label
                  key={key}
                  className="space-y-2 text-xs text-muted-foreground"
                >
                  {t(index ? "ends" : "starts")}
                  <InputTA
                    type="date"
                    value={form[key] ?? ""}
                    onChange={(event) =>
                      update(key, event.target.value || null)
                    }
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={form.is_active}
              onChange={(event) => update("is_active", event.target.checked)}
            />
            {t("activeLabel")}
          </label>
          {mutations.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutations.error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <ButtonTA
              type="button"
              variant="outline"
              disabled={mutations.busy}
              onClick={onClose}
            >
              {t("cancel")}
            </ButtonTA>
            <ButtonTA
              type="submit"
              disabled={
                mutations.busy ||
                !form.conditions.days_of_week.length ||
                form.conditions.time_start >= form.conditions.time_end
              }
            >
              {t(mutations.busy ? "saving" : "save")}
            </ButtonTA>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
