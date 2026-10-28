import { ArrowRight, Check, Gift, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { formatDate } from "@/i18n/formatters";
import type { BenefitAction, BenefitProgram } from "@/modules/benefits/types";

// COMPONENT
export const LoyaltyBenefitTA = ({
  program,
  pending,
  select,
}: {
  program: BenefitProgram;
  pending: boolean;
  select: (action: BenefitAction) => void;
}) => {
  const { t } = useTranslation("benefits");
  const current = program.card?.stamps ?? 0;
  const ready = program.card?.available ?? false;
  const url = `/cliente/business/${program.business.id}?book=1${program.service ? `&service_id=${program.service.id}` : ""}${program.professional ? `&professional_id=${program.professional.id}` : ""}`;
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {program.business.name}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight">
            {program.name}
          </h3>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Gift className="size-5" />
        </span>
      </div>
      <p className="mt-4 font-medium">{program.reward}</p>
      {program.description && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {program.description}
        </p>
      )}
      <div className="my-6">
        {program.required <= 10 && (
          <div className="mb-4 flex flex-wrap gap-2" aria-hidden="true">
            {Array.from({ length: program.required }, (_, index) => (
              <span
                key={index}
                className={`grid size-9 place-items-center rounded-full border ${index < current ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-border text-muted-foreground/40"}`}
              >
                {index < current ? (
                  <Check className="size-4" />
                ) : (
                  <Plus className="size-3" />
                )}
              </span>
            ))}
          </div>
        )}
        <div className="mb-2 flex justify-between gap-3 text-xs">
          <span>{t("progress", { current, total: program.required })}</span>
          <span className="text-primary">
            {ready
              ? t("rewardReady")
              : t("remaining", {
                  count: Math.max(0, program.required - current),
                })}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={program.name}
          aria-valuenow={Math.min(current, program.required)}
          aria-valuemin={0}
          aria-valuemax={program.required}
          className="h-2 overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
            style={{
              width: `${Math.min(100, (100 * current) / Math.max(1, program.required))}%`,
            }}
          />
        </div>
      </div>
      <div className="mb-5 space-y-1 text-xs text-muted-foreground">
        {program.service && (
          <p>{t("serviceOnly", { name: program.service.name })}</p>
        )}
        {program.professional && (
          <p>{t("restricted", { name: program.professional.name })}</p>
        )}
        <p>
          {program.expires_at
            ? t("expires", { date: formatDate(program.expires_at) })
            : t("noExpiry")}
        </p>
      </div>
      <div className="mt-auto">
        {!program.card ? (
          <ButtonTA
            className="w-full"
            disabled={pending}
            onClick={() => select({ kind: "join", program })}
          >
            {t("join")}
          </ButtonTA>
        ) : ready ? (
          <ButtonTA
            className="w-full"
            disabled={pending}
            onClick={() => select({ kind: "redeem", program })}
          >
            <Gift />
            {t("redeem")}
          </ButtonTA>
        ) : (
          <ButtonTA
            className="w-full"
            variant="outline"
            render={<Link to={url} />}
            nativeButton={false}
          >
            {t("visit")}
            <ArrowRight />
          </ButtonTA>
        )}
      </div>
    </article>
  );
};
