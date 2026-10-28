import { OnDemandQuoteTA } from "@/modules/home-service/components/OnDemandQuoteTA";
import { ReservationSupportTA } from "@/modules/reservation-support/components/ReservationSupportTA";
import { Check, Clock3, MapPin, Phone, UserRound } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { useHomeServiceClock } from "@/modules/home-service/composables/useHomeServiceClock";
import { HomeServiceMapTA } from "@/modules/home-service/components/HomeServiceMapTA";
import {
  HOME_SERVICE_STATUS,
  canCancelHomeService,
  formatHomeServiceDate,
  formatHomeServicePrice,
  homeServicePoint,
  homeServiceSteps,
  isHomeServiceActive,
  isHomeServiceExpired,
} from "@/modules/home-service/helpers";
import type {
  OnDemandLocation,
  OnDemandRequest,
} from "@/services/ondemand/ondemandService";
import type { HomeServiceCancellationState } from "@/modules/home-service/types";

// TYPES
interface HomeServiceProgressProps {
  request: OnDemandRequest;
  location: OnDemandLocation | null;
  cancellation?: HomeServiceCancellationState;
  onNew?: () => void;
}

// COMPONENT
export const HomeServiceProgressTA = ({
  request,
  location,
  cancellation,
  onNew,
}: HomeServiceProgressProps) => {
  // COMPOSABLES
  const now = useHomeServiceClock(isHomeServiceActive(request));

  // COMPUTED
  const steps = homeServiceSteps(request);
  const currentStep = steps.findIndex((step) => step.status === request.status);
  const cancelled = request.status === "CANCELLED";
  const expired = isHomeServiceExpired(request, now);
  const point = homeServicePoint(request.client_lat, request.client_lng);
  const stale = Boolean(location && (location.is_stale || new Date(location.fresh_until ?? new Date(new Date(location.recorded_at).getTime() + 300000).toISOString()).getTime() <= now));
  const professionalPoint = location && !stale
    ? homeServicePoint(location.lat, location.lng)
    : null;
  const liveTracking =
    isHomeServiceActive(request) && request.professional_id !== null;

  // RENDER
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.85fr)]">
      <div className="space-y-5">
        <PanelTA
          title={
            expired
              ? "No se encontró un profesional a tiempo"
              : HOME_SERVICE_STATUS[request.status]
          }
          description={
            expired
              ? "La búsqueda venció. Cancela esta solicitud y vuelve a intentar cuando lo prefieras."
              : cancelled
                ? (request.cancellation_reason ??
                  "Esta solicitud ya no está activa.")
                : steps[currentStep]?.description
          }
          action={
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
              {request.request_code}
            </span>
          }
        >
          <div className="space-y-5 px-5 pb-6 md:px-6">
            {!cancelled && (
              <ol
                className="space-y-0"
                aria-label="Seguimiento de la solicitud"
              >
                {steps.map((step, index) => (
                  <li
                    key={step.status}
                    aria-current={index === currentStep ? "step" : undefined}
                    className="relative flex gap-4 pb-5 last:pb-0"
                  >
                    {index < steps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-[15px] top-8 h-[calc(100%-24px)] w-px ${index < currentStep ? "bg-primary" : "bg-border"}`}
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={`z-10 grid size-8 shrink-0 place-items-center rounded-full border text-xs font-bold ${index <= currentStep ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
                    >
                      {index < currentStep ? (
                        <Check className="size-4" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="pt-1">
                      <p
                        className={`text-sm font-semibold ${index > currentStep ? "text-muted-foreground" : ""}`}
                      >
                        {step.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {step.date
                          ? formatHomeServiceDate(step.date)
                          : index <= currentStep
                            ? step.description
                            : "Pendiente"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <div className="rounded-xl border border-border bg-background p-4 text-sm">
              <p className="flex items-start gap-2 font-medium">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                {request.client_address || "Dirección no registrada"}
              </p>
              <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                {request.description ??
                  request.service?.name ??
                  "Servicio a domicilio"}
              </p>
            </div>
            {!isHomeServiceActive(request) && onNew && (
              <ButtonTA onClick={onNew}>Solicitar otro servicio</ButtonTA>
            )}
          </div>
        </PanelTA>
        {point && (
          <PanelTA
            title={
              professionalPoint
                ? "Ubicación del profesional"
                : "Tu punto de atención"
            }
            description={
              liveTracking
                ? location
                  ? `${stale ? "Ubicación no actualizada. " : ""}Última ubicación compartida: ${formatHomeServiceDate(location.recorded_at)}. Revisa la hora para saber qué tan reciente es.`
                  : "El profesional todavía no tiene una ubicación compartida disponible."
                : "Dirección registrada para esta solicitud."
            }
          >
            <div className="px-5 pb-5 md:px-6">
              <HomeServiceMapTA
                point={point}
                professional={liveTracking ? professionalPoint : null}
              />
            </div>
          </PanelTA>
        )}
        <OnDemandQuoteTA key={`${request.id}-${request.metadata?.price_quote?.id ?? "quote"}`} request={request} />
        <ReservationSupportTA key={request.id} kind="on-demand" id={request.id} />
      </div>
      <aside className="space-y-5">
        <PanelTA
          title={
            request.professional ? "Tu profesional" : "Buscando cerca de ti"
          }
          description={
            request.professional
              ? "Verifica los detalles antes de iniciar el servicio."
              : expired
                ? "La búsqueda finalizó sin asignación."
                : cancelled
                  ? "Solicitud cancelada."
                  : "La disponibilidad depende de los profesionales de tu zona."
          }
        >
          <div className="space-y-4 px-5 pb-5 md:px-6">
            {request.professional ? (
              <div className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10">
                  {request.professional.photo_url ? (
                    <img
                      src={request.professional.photo_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound className="size-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{request.professional.name}</p>
                  {request.business && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.business.name}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-3 rounded-xl bg-secondary/50 p-4">
                <Clock3 className="size-5 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {request.search_expires_at
                    ? `Búsqueda disponible hasta ${formatHomeServiceDate(request.search_expires_at)}.`
                    : "El perfil del profesional aparecerá cuando acepte tu solicitud."}
                </p>
              </div>
            )}
            {request.professional?.phone && (
              <a
                href={`tel:${request.professional.phone.replace(/[^+\d]/g, "")}`}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Phone className="size-4" />
                Llamar al profesional
              </a>
            )}
            <dl className="border-t border-border pt-4">
              <dt className="text-xs text-muted-foreground">
                {request.final_price != null
                  ? "Valor final registrado"
                  : "Valor estimado registrado"}
              </dt>
              <dd className="mt-1 text-2xl font-bold">
                {formatHomeServicePrice(
                  request.final_price ?? request.estimated_price,
                  request.currency,
                )}
              </dd>
              <dd className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {request.final_price == null
                  ? "Confirma el precio con el profesional antes de comenzar."
                  : "Consulta tu método de pago y el comprobante con el negocio."}
              </dd>
            </dl>
          </div>
        </PanelTA>
        {cancellation && canCancelHomeService(request) && (
          <PanelTA
            title="¿Cambió tu plan?"
            description="Puedes cancelar antes de que el servicio comience."
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void cancellation.cancel();
              }}
              className="space-y-3 px-5 pb-5 md:px-6"
            >
              <label
                htmlFor="home-service-cancel-reason"
                className="block text-xs font-medium"
              >
                Motivo de cancelación
              </label>
              <InputTA
                id="home-service-cancel-reason"
                value={cancellation.reason}
                onChange={(event) => cancellation.setReason(event.target.value)}
                minLength={3}
                maxLength={500}
                required
                placeholder="Ej. Necesito cambiar la dirección"
                disabled={cancellation.busy}
              />
              <ButtonTA
                type="submit"
                variant="outline"
                className="w-full text-destructive"
                disabled={
                  cancellation.busy || cancellation.reason.trim().length < 3
                }
              >
                {cancellation.busy ? "Cancelando…" : "Cancelar solicitud"}
              </ButtonTA>
            </form>
          </PanelTA>
        )}
      </aside>
    </div>
  );
};
