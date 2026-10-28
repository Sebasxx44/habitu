import { ArrowLeft, BadgeCheck, Plus, RefreshCw } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { DashboardSkeletonTA, StateTA } from "@/components/TA/StateTA";
import { formatDate } from "@/i18n/formatters";
import { benefitAdminPath } from "@/modules/benefits/adminPresentation";
import { useAdminLoyaltyCard } from "@/modules/benefits/composables/useAdminLoyaltyCard";

// VIEW
export const AdminLoyaltyCardPage = () => {
  // COMPOSABLES
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { card, stamp } = useAdminLoyaltyCard(Number(id));
  // COMPUTED
  const data = card.data;
  const back = benefitAdminPath("programs", params.get("business_id") ?? "");
  return (
    <div className="page-enter space-y-6">
      <ButtonTA
        variant="ghost"
        disabled={stamp.busy}
        onClick={() => navigate(back)}
      >
        <ArrowLeft />
        Volver a fidelidad
      </ButtonTA>
      <ActionHeaderTA
        eyebrow="Tarjeta de fidelidad"
        title={data?.card.client.name ?? "Historial del cliente"}
        description={
          data?.card.program.name ?? "Consulta visitas, progreso y recompensas."
        }
        actions={
          <ButtonTA
            variant="outline"
            disabled={card.loading}
            onClick={card.refresh}
          >
            <RefreshCw />
            Actualizar
          </ButtonTA>
        }
      />
      {card.error ? (
        <StateTA
          error
          title="Tarjeta no disponible"
          description={card.error}
          onRetry={card.refresh}
        />
      ) : !data ? (
        <DashboardSkeletonTA />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <PanelTA
            title="Progreso de la recompensa"
            description={data.card.program.reward_description}
          >
            <div className="space-y-4 px-6 pb-6">
              <BadgeCheck className="size-10 text-primary" />
              <p className="text-3xl font-bold">
                {data.card.current_stamps}
                <span className="ml-1 text-sm font-medium text-muted-foreground">
                  / {data.card.program.stamps_required} sellos
                </span>
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min(100, (data.card.current_stamps / Math.max(1, data.card.program.stamps_required)) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {data.card.reward_available
                  ? "El cliente puede canjear su recompensa desde sus beneficios."
                  : `Faltan ${Math.max(0, data.card.program.stamps_required - data.card.current_stamps)} visitas para desbloquear la recompensa.`}
              </p>
              <p className="rounded-xl bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
                Las citas completadas suman automáticamente. Registra un sello
                manual sólo para una visita que no quedó registrada.
              </p>
              {stamp.success && (
                <p role="status" className="text-sm text-primary">
                  {stamp.success}
                </p>
              )}
              {stamp.confirming ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">
                    ¿Registrar una visita manual?
                  </p>
                  {stamp.error && (
                    <p role="alert" className="text-sm text-destructive">
                      {stamp.error}
                    </p>
                  )}
                  <ButtonTA
                    className="w-full"
                    disabled={stamp.busy}
                    onClick={() => void stamp.confirm()}
                  >
                    {stamp.busy ? "Registrando…" : "Confirmar sello"}
                  </ButtonTA>
                  <ButtonTA
                    variant="outline"
                    className="w-full"
                    disabled={stamp.busy}
                    onClick={stamp.cancel}
                  >
                    Cancelar
                  </ButtonTA>
                </div>
              ) : (
                <ButtonTA
                  className="w-full"
                  disabled={stamp.busy || data.card.status !== "ACTIVE"}
                  onClick={stamp.select}
                >
                  <Plus />
                  Añadir sello manual
                </ButtonTA>
              )}
            </div>
          </PanelTA>
          <PanelTA
            title="Historial de movimientos"
            description="Últimos 50 movimientos de esta tarjeta."
          >
            {data.history.length ? (
              <div className="divide-y divide-border">
                {data.history.map((entry) => (
                  <article
                    className="flex justify-between gap-4 px-6 py-4"
                    key={entry.id}
                  >
                    <div>
                      <p className="text-sm font-medium">{entry.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(entry.created_at, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-primary">
                      {entry.points > 0 ? "+" : ""}
                      {entry.points} sellos
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <StateTA
                title="Esta historia está por comenzar"
                description="Los sellos y canjes aparecerán aquí."
              />
            )}
          </PanelTA>
        </div>
      )}
    </div>
  );
};
