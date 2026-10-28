import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { ConfirmDialogTA } from "@/components/TA/ConfirmDialogTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { Skeleton } from "@/components/ui/skeleton";
import { usePricingCatalog } from "@/modules/pricing/composables/usePricingCatalog";
import { usePricingRules } from "@/modules/pricing/composables/usePricingRules";
import { PricingRuleEditorTA } from "@/modules/pricing/components/PricingRuleEditorTA";
import { PricingSimulationTA } from "@/modules/pricing/components/PricingSimulationTA";
import { formatCurrency, formatNumber, formatTime } from "@/i18n/formatters";
import type { PricingRule } from "@/modules/pricing/types";
// PAGE
export const PricingPage = () => {
  const { t } = useTranslation("pricing");
  const { catalog, selection } = usePricingCatalog();
  const { collection, mutations } = usePricingRules(selection.id);
  const [editor, setEditor] = useState<PricingRule | null | undefined>(
    undefined,
  );
  const [deleting, setDeleting] = useState<PricingRule | null>(null);
  const context = catalog.data;
  return (
    <div className="page-enter mx-auto min-w-0 max-w-7xl space-y-7 pb-10">
      <ActionHeaderTA
        icon={SlidersHorizontal}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          <ButtonTA
            disabled={!context?.business || catalog.loading}
            onClick={() => setEditor(null)}
          >
            <Plus className="size-4" />
            {t("add")}
          </ButtonTA>
        }
      />
      {catalog.error ? (
        <StateTA
          error
          title={t("loadError")}
          description={catalog.error}
          onRetry={catalog.reload}
        />
      ) : catalog.loading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : !context?.business ? (
        <StateTA title={t("noBusiness")} description={t("noServices")} />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-card p-5">
            <label className="w-full space-y-2 text-xs font-medium sm:w-80">
              {t("business")}
              <select
                className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                value={selection.id ?? ""}
                onChange={(event) => {
                  setEditor(undefined);
                  setDeleting(null);
                  selection.select(Number(event.target.value));
                }}
              >
                {context.businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="size-4" />
              {t("timezone")} · {context.timezone} · {context.currency}
            </p>
          </div>
          <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.35fr)]">
            <PanelTA
              title={t("rules")}
              description={t("rulesDescription")}
              action={
                <ButtonTA
                  variant="ghost"
                  aria-label={t("refresh")}
                  onClick={collection.reload}
                  disabled={collection.loading}
                >
                  <RefreshCw className="size-4" />
                </ButtonTA>
              }
            >
              {collection.loading ? (
                <div className="space-y-3 p-5">
                  <Skeleton className="h-28 rounded-xl" />
                  <Skeleton className="h-28 rounded-xl" />
                </div>
              ) : collection.error ? (
                <StateTA
                  error
                  title={t("loadError")}
                  description={collection.error}
                  onRetry={collection.reload}
                />
              ) : !collection.items.length ? (
                <StateTA
                  title={t("emptyRules")}
                  description={t("emptyRulesDescription")}
                />
              ) : (
                <div className="divide-y divide-border">
                  {collection.items.map((rule) => (
                    <article key={rule.id} className="space-y-3 px-5 py-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                            {rule.service_name ?? t("allServices")}
                          </p>
                          <h3 className="text-sm font-semibold">{rule.name}</h3>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] ${rule.is_active && rule.supported ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}`}
                        >
                          {t(
                            !rule.supported
                              ? "unsupported"
                              : rule.is_active
                                ? "enabled"
                                : "disabled",
                          )}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {rule.conditions.days_of_week
                          .map((day) => t(`weekdays.${day}`))
                          .join(" · ")}
                        <br />
                        {formatTime(rule.conditions.time_start)} —{" "}
                        {formatTime(rule.conditions.time_end)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-lg border border-border px-2.5 py-1.5">
                          × {formatNumber(rule.multiplier)}
                        </span>
                        {rule.flat_adjustment !== 0 && (
                          <span className="rounded-lg border border-border px-2.5 py-1.5">
                            {rule.flat_adjustment > 0 ? "+" : "−"}{" "}
                            {formatCurrency(
                              Math.abs(rule.flat_adjustment),
                              context.currency,
                            )}
                          </span>
                        )}
                        <span className="ml-auto text-muted-foreground">
                          {t("priority")} {rule.priority}
                        </span>
                      </div>
                      {!rule.supported && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {t("unsupportedDescription")}
                        </p>
                      )}
                      <div className="flex justify-end gap-2">
                        <ButtonTA
                          variant="ghost"
                          disabled={mutations.busy}
                          onClick={() => setEditor(rule)}
                        >
                          <Pencil className="size-3.5" />
                          {t("edit")}
                        </ButtonTA>
                        <ButtonTA
                          variant="ghost"
                          disabled={mutations.busy}
                          onClick={() => setDeleting(rule)}
                          aria-label={`${t("remove")} ${rule.name}`}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </ButtonTA>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className="flex items-start gap-3 border-t border-border bg-secondary/30 px-5 py-4">
                <SlidersHorizontal className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("formula")}
                </p>
              </div>
            </PanelTA>
            <div className="min-w-0">
              {context.business.services.length &&
              context.business.branches.length ? (
                <PricingSimulationTA
                  key={context.business.id}
                  context={context}
                />
              ) : (
                <StateTA
                  title={t("noServices")}
                  description={t("simulationEmptyDescription")}
                />
              )}
            </div>
          </div>
          {editor !== undefined && (
            <PricingRuleEditorTA
              context={context}
              rule={editor}
              mutations={mutations}
              onClose={() => setEditor(undefined)}
            />
          )}
        </>
      )}
      <ConfirmDialogTA
        open={!!deleting}
        title={t("removeTitle")}
        description={t("removeDescription")}
        confirmLabel={t("remove")}
        busy={mutations.busy}
        error={mutations.error}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting)
            void mutations.remove(deleting.id).then((done) => {
              if (done) setDeleting(null);
            });
        }}
      />
    </div>
  );
};
