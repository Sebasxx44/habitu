import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Crown, Gift, Tag } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { useBookingBenefits } from "@/composables/booking/useBookingBenefits";
import type {
  BookingBusiness,
  BookingCheckoutState,
  BookingFlowState,
} from "@/composables/booking/types";

// COMPONENT
export const BookingBenefitsTA = ({
  business,
  flow,
  checkout,
}: {
  business: BookingBusiness;
  flow: BookingFlowState;
  checkout: BookingCheckoutState;
}) => {
  // COMPOSABLES
  const { catalog, enrollment, actions } = useBookingBenefits({
    businessId: business.id,
    serviceId: flow.selection.serviceId,
    professionalId:
      checkout.summary.quote?.professional?.id ??
      flow.journey.professional?.id ??
      null,
    date: flow.selection.date,
    time: flow.selection.time,
    subtotal: checkout.summary.quote?.subtotal ?? null,
  });
  const disabled = checkout.submission.submitting || checkout.summary.loading;
  const link = `/cliente/benefits?business_id=${business.id}`;

  return (
    <section
      className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 sm:p-5"
      aria-label="Beneficios para tu reserva"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Gift className="size-4 text-primary" />
          Beneficios para esta reserva
        </h3>
        <Link
          className="text-xs text-primary underline underline-offset-4"
          to={link}
          target="_blank"
          rel="noreferrer"
        >
          Ver todos
          <ArrowUpRight className="ml-1 inline size-3" />
        </Link>
      </div>
      {catalog.error ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
        >
          <span>{catalog.error}</span>
          <ButtonTA variant="ghost" size="sm" onClick={actions.reload}>
            Actualizar
          </ButtonTA>
        </div>
      ) : catalog.loading &&
        !catalog.promotions.length &&
        !catalog.programs.length &&
        !catalog.memberships.length ? (
        <p role="status" className="text-xs text-muted-foreground">
          Consultando tus beneficios…
        </p>
      ) : (
        <>
          {!!catalog.promotions.length && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Cupones disponibles · el total se valida al aplicar
              </p>
              {catalog.promotions.slice(0, 4).map((promotion) => {
                const selected =
                  checkout.summary.appliedCode.toUpperCase() ===
                  promotion.code?.toUpperCase();
                return (
                  <div
                    key={promotion.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{promotion.title}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-primary">
                        <Tag className="size-3" />
                        <span className="truncate">{promotion.code}</span>
                      </p>
                    </div>
                    <ButtonTA
                      variant={selected ? "secondary" : "outline"}
                      size="sm"
                      disabled={disabled || selected || !promotion.code}
                      onClick={() => {
                        if (promotion.code)
                          checkout.actions.selectPromo(promotion.code);
                      }}
                    >
                      {selected ? (
                        <>
                          <Check className="size-3.5" />
                          Seleccionado
                        </>
                      ) : (
                        "Aplicar"
                      )}
                    </ButtonTA>
                  </div>
                );
              })}
            </div>
          )}
          {!!catalog.memberships.length && (
            <div className="space-y-2">
              {catalog.memberships.map((membership) => (
                <div key={membership.id} className="flex gap-2 text-xs">
                  <Crown className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">
                      {membership.plan_snapshot?.name ?? membership.plan.name}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {membership.appointments_remaining > 0
                        ? `${membership.appointments_remaining} reservas incluidas disponibles.`
                        : `Descuento de ${Number((membership.plan_snapshot ?? membership.plan).discount_percentage)}% disponible.`}{" "}
                      El total confirma el beneficio aplicado.
                    </p>
                  </div>
                </div>
              ))}
              {checkout.summary.appliedCode && (
                <p className="text-xs text-muted-foreground">
                  El cupón sustituye el beneficio de membresía; no se acumulan.
                </p>
              )}
            </div>
          )}
          {!!catalog.programs.length && (
            <div className="space-y-3 border-t border-primary/10 pt-3">
              {catalog.programs.slice(0, 3).map((program) => (
                <div key={program.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{program.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {program.reward}
                      </p>
                    </div>
                    {program.card ? (
                      <span className="shrink-0 text-xs font-semibold text-primary">
                        {program.card.stamps}/{program.required} sellos
                      </span>
                    ) : (
                      <ButtonTA
                        variant="outline"
                        size="sm"
                        disabled={disabled || enrollment.pendingId !== null}
                        onClick={() => void actions.join(program.id)}
                      >
                        {enrollment.pendingId === program.id
                          ? "Activando…"
                          : "Activar tarjeta"}
                      </ButtonTA>
                    )}
                  </div>
                  {program.card && (
                    <>
                      <div
                        role="progressbar"
                        aria-label={program.name}
                        aria-valuemin={0}
                        aria-valuemax={program.required}
                        aria-valuenow={Math.min(
                          program.card.stamps,
                          program.required,
                        )}
                        className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/10"
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.min(100, (program.card.stamps / program.required) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {program.card.available
                          ? "Tienes un premio disponible en tus beneficios."
                          : "Sumas un sello cuando completes esta visita."}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {!catalog.memberships.length && !!catalog.plans.length && (
            <Link
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-xs"
              to={`${link}&tab=memberships`}
              target="_blank"
              rel="noreferrer"
            >
              <span>
                <span className="flex items-center gap-2 font-medium">
                  <Crown className="size-4 text-primary" />
                  {catalog.plans.length}{" "}
                  {catalog.plans.length === 1
                    ? "plan disponible"
                    : "planes disponibles"}
                </span>
                <span className="mt-1 block text-muted-foreground">
                  Consulta membresías y beneficios antes de reservar.
                </span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-primary" />
            </Link>
          )}
          {!catalog.promotions.length &&
            !catalog.programs.length &&
            !catalog.memberships.length &&
            !catalog.plans.length && (
              <p className="text-xs text-muted-foreground">
                No hay beneficios disponibles para este servicio y fecha. Si
                tienes un cupón, puedes ingresarlo abajo.
              </p>
            )}
        </>
      )}
      {enrollment.error && (
        <p role="alert" className="text-xs text-destructive">
          {enrollment.error}
        </p>
      )}
    </section>
  );
};
