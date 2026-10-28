import { Check, Gift, History, RefreshCw, Sparkles, Star } from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { ConfirmDialogTA } from "@/components/TA/ConfirmDialogTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { DashboardSkeletonTA, StateTA } from "@/components/TA/StateTA";
import { useLoyaltyAccount } from "@/modules/loyalty/composables/useLoyaltyAccount";
import { useLoyaltyRedemption } from "@/modules/loyalty/composables/useLoyaltyRedemption";

// COMPONENT
export const LoyaltyPage = () => {
  const { account } = useLoyaltyAccount();
  const { redemption } = useLoyaltyRedemption(account.refresh);
  const data = account.data;
  const available = data?.cards.filter((card) => card.available).length || 0;

  return (
    <div className="dashboard-enter space-y-7">
      <ActionHeaderTA
        icon={Gift}
        eyebrow="Tus visitas cuentan"
        title="Pequeños hábitos. Grandes detalles."
        description="Sigue tu progreso y disfruta las recompensas de tus negocios favoritos."
        actions={
          <ButtonTA
            variant="outline"
            onClick={account.refresh}
            disabled={account.loading}
          >
            <RefreshCw className={account.loading ? "animate-spin" : ""} />
            Actualizar
          </ButtonTA>
        }
      />
      {account.error && (
        <PanelTA title="Tus recompensas">
          <StateTA
            error
            title="No pudimos cargar tus beneficios"
            description={account.error}
            onRetry={account.refresh}
          />
        </PanelTA>
      )}
      {!data && account.loading ? (
        <DashboardSkeletonTA />
      ) : data && !account.error ? (
        <>
          <section className="surface-primary dashboard-hero flex flex-col justify-between gap-8 rounded-3xl p-6 text-white md:flex-row md:items-center md:p-8">
            <div>
              <Sparkles className="mb-4 size-6 text-habitu-lime" />
              <h2 className="text-2xl font-medium tracking-tight">
                Siempre es un buen momento para volver.
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/90">
                Cada programa tiene su propia recompensa. Consulta tu progreso y
                canjea cuando esté disponible.
              </p>
            </div>
            <div className="flex flex-wrap gap-8 rounded-2xl border border-white/20 bg-white/10 p-5 md:gap-10">
              <div>
                <Star className="mb-3 size-4 text-white/90" />
                <p className="text-4xl font-semibold tracking-tight tabular-nums">
                  {data.points.toLocaleString("es-CO")}
                </p>
                <p className="mt-2 text-xs text-white/90">Puntos acumulados</p>
              </div>
              <div>
                <Gift className="mb-3 size-4 text-white/90" />
                <p className="text-4xl font-semibold tracking-tight tabular-nums">
                  {available}
                </p>
                <p className="mt-2 text-xs text-white/90">
                  Listas para canjear
                </p>
              </div>
            </div>
          </section>
          <section aria-labelledby="loyalty-cards-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="loyalty-cards-heading"
                className="text-lg font-semibold tracking-tight"
              >
                Tus tarjetas de fidelidad
              </h2>
              <span className="text-xs text-muted-foreground">
                {data.cards.length} programas
              </span>
            </div>
            {data.cards.length ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {data.cards.map((card) => (
                  <PanelTA
                    key={card.id}
                    title={card.business}
                    description={card.name}
                    action={
                      <div className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                        <Gift className="size-4" />
                      </div>
                    }
                  >
                    <div className="px-5 pb-6 md:px-6">
                      <p className="min-h-10 text-sm font-medium">
                        {card.reward}
                      </p>
                      <div className="mb-2 mt-5 flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Tu progreso
                        </span>
                        <span className="font-semibold tabular-nums">
                          {card.stamps} de {card.required}
                        </span>
                      </div>
                      <div
                        className="h-2.5 overflow-hidden rounded-full bg-secondary"
                        role="progressbar"
                        aria-label={`Progreso ${card.name}`}
                        aria-valuenow={Math.min(card.stamps, card.required)}
                        aria-valuemin={0}
                        aria-valuemax={card.required || 1}
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.min((card.stamps / (card.required || 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="mt-3 min-h-5 text-xs text-muted-foreground">
                        {card.available ? (
                          <span className="flex items-center gap-1 font-medium text-primary">
                            <Check className="size-3.5" />
                            Tu recompensa está lista
                          </span>
                        ) : card.status === "EXPIRED" ? (
                          "Este programa ha vencido"
                        ) : card.status === "INACTIVE" ? (
                          "Este programa no está activo"
                        ) : (
                          `${Math.max(card.required - card.stamps, 0)} visitas para tu próxima recompensa`
                        )}
                      </p>
                      {card.validUntil && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Vence el{" "}
                          {new Intl.DateTimeFormat("es-CO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(
                            new Date(
                              `${card.validUntil.slice(0, 10)}T12:00:00`,
                            ),
                          )}
                        </p>
                      )}
                      <ButtonTA
                        className="mt-5 w-full"
                        variant={card.available ? "default" : "outline"}
                        disabled={
                          !card.available ||
                          account.loading ||
                          redemption.submitting
                        }
                        onClick={() => redemption.select(card)}
                      >
                        {card.available
                          ? "Canjear recompensa"
                          : "Sigue sumando visitas"}
                      </ButtonTA>
                    </div>
                  </PanelTA>
                ))}
              </div>
            ) : (
              <PanelTA title="El primer paso está por llegar">
                <StateTA
                  title="Todavía no tienes tarjetas"
                  description="Cuando participes en un programa de fidelidad, podrás seguir tus visitas y recompensas aquí."
                />
              </PanelTA>
            )}
          </section>
          <PanelTA
            title="Tu historia suma"
            description="Últimas 50 operaciones de puntos"
            action={<History className="size-4 text-muted-foreground" />}
          >
            {data.history.length ? (
              <div className="divide-y divide-border">
                {data.history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-5 py-4 md:px-6"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                      <Star className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {item.description || "Movimiento de puntos"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("es-CO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(item.createdAt))}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
                      {item.points > 0 ? "+" : ""}
                      {item.points} pts
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <StateTA
                title="Un historial por construir"
                description="Aquí encontrarás el detalle de los puntos que acumules o utilices."
              />
            )}
          </PanelTA>
        </>
      ) : null}
      <ConfirmDialogTA
        open={redemption.selected !== null}
        title="Tu recompensa te espera"
        description={
          redemption.selected
            ? `Vas a canjear «${redemption.selected.reward}» en ${redemption.selected.business}. Se utilizarán las visitas acumuladas de esta tarjeta y el canje quedará registrado.`
            : ""
        }
        confirmLabel="Confirmar canje"
        busy={redemption.submitting}
        error={redemption.error}
        onClose={redemption.close}
        onConfirm={() => {
          void redemption.confirm();
        }}
      />
    </div>
  );
};
