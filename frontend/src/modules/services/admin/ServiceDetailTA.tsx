import {
  ArrowLeft,
  CalendarPlus,
  Clock,
  Copy,
  Edit3,
  Pause,
  Play,
  Scissors,
  Settings2,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { ServiceInsightsTA } from "@/modules/services/admin/ServiceInsightsTA";
import { useServiceActions } from "@/modules/services/admin/useServiceActions";
import { serviceBookingLabel } from "@/modules/services/admin/servicePresentation";
import { isPublicMediaUrl } from "@/modules/media/MediaGalleryTA";
import { formatCurrency } from "@/i18n/formatters";
import type { Service } from "@/types/models";

// COMPONENT
export const ServiceDetailTA = ({
  service,
  refresh,
}: {
  service: Service;
  refresh: () => Promise<void>;
}) => {
  const navigate = useNavigate();
  const { status, actions } = useServiceActions(service, refresh);
  const gallery = (service.media_gallery ?? []).filter((item) =>
    isPublicMediaUrl(item.url),
  );
  return (
    <div className="space-y-6 pb-10">
      <ButtonTA
        variant="ghost"
        className="-ml-3"
        onClick={() => navigate("/admin/services")}
      >
        <ArrowLeft className="size-4" />
        Volver a servicios
      </ButtonTA>
      <ActionHeaderTA
        eyebrow={`Servicios · ${service.category || "General"}`}
        title={service.name}
        description="Información, reglas de reserva y resultados en un solo lugar."
        actions={
          <>
            <ButtonTA
              variant="outline"
              onClick={() => navigate(`/admin/services/${service.id}/settings`)}
            >
              <Settings2 className="size-4" />
              Configurar reservas
            </ButtonTA>
            <ButtonTA
              variant="outline"
              onClick={() => navigate(`/admin/services/${service.id}/edit`)}
            >
              <Edit3 className="size-4" />
              Editar servicio
            </ButtonTA>
            {service.is_active !== false && (
              <ButtonTA
                onClick={() =>
                  navigate(`/admin/calendar/new?service_id=${service.id}`)
                }
              >
                <CalendarPlus className="size-4" />
                Nueva reserva
              </ButtonTA>
            )}
          </>
        }
      />
      {status.error && (
        <StateTA
          error
          title="No se pudo completar la acción"
          description={status.error}
        />
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <PanelTA
          title="Presentación del servicio"
          action={
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${service.is_active === false ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}
            >
              {service.is_active === false ? "Inactivo" : "Activo"}
            </span>
          }
        >
          <div className="space-y-5 px-5 pb-5 sm:px-6">
            <div className="flex items-start gap-4">
              {service.image_url ? (
                <img
                  src={service.image_url}
                  alt={service.name}
                  className="size-28 shrink-0 rounded-xl object-cover sm:size-36"
                />
              ) : (
                <div className="grid size-28 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary sm:size-36">
                  <Scissors className="size-10" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Precio base</p>
                <p className="mt-1 break-words text-2xl font-semibold tracking-tight">
                  {formatCurrency(service.price)}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  {service.duration_minutes ?? service.duration} minutos
                </p>
                {service.duration_mode === "selectable" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Duraciones disponibles:{" "}
                    {service.duration_options?.join(", ")} min
                  </p>
                )}
              </div>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {service.description ||
                "Este servicio todavía no tiene descripción. Añádela para explicar qué incluye y ayudar a tus clientes a elegir."}
            </p>
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <ButtonTA
                size="sm"
                variant="outline"
                disabled={status.pending}
                onClick={() => void actions.toggle()}
              >
                {service.is_active === false ? (
                  <Play className="size-3.5" />
                ) : (
                  <Pause className="size-3.5" />
                )}
                {status.pending
                  ? "Actualizando…"
                  : service.is_active === false
                    ? "Activar servicio"
                    : "Desactivar"}
              </ButtonTA>
              <ButtonTA
                size="sm"
                variant="ghost"
                onClick={() =>
                  navigate(`/admin/services/new?copy=${service.id}`)
                }
              >
                <Copy className="size-3.5" />
                Duplicar
              </ButtonTA>
              <ButtonTA
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => navigate(`/admin/services/${service.id}/delete`)}
              >
                <Trash2 className="size-3.5" />
                Eliminar
              </ButtonTA>
            </div>
          </div>
        </PanelTA>
        <PanelTA
          title="Reglas de reserva"
          description={serviceBookingLabel(service)}
        >
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 px-5 pb-5 text-sm sm:px-6">
            {[
              {
                label: "Capacidad por horario",
                value: `${service.booking_capacity ?? 1} reserva(s)`,
              },
              {
                label: "Intervalo de horarios",
                value: `${service.slot_interval_minutes ?? 15} min`,
              },
              {
                label: "Margen entre citas",
                value: `${service.buffer_minutes ?? 0} min`,
              },
              {
                label: "Anticipación mínima",
                value: `${service.min_advance_minutes ?? 0} min`,
              },
              {
                label: "Anticipación máxima",
                value:
                  service.max_advance_days == null
                    ? "Sin límite configurado"
                    : `${service.max_advance_days} días`,
              },
              {
                label: "Confirmación",
                value:
                  service.requires_confirmation !== false
                    ? "Requiere confirmación"
                    : "Automática",
              },
              {
                label: "Cancelación",
                value:
                  service.allow_cancellation !== false
                    ? `Permitida · ${service.cancellation_notice_minutes ?? 0} min antes`
                    : "No permitida",
              },
              {
                label: "Reprogramación",
                value:
                  service.allow_reschedule !== false
                    ? `Permitida · ${service.reschedule_notice_minutes ?? 0} min antes`
                    : "No permitida",
              },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 font-medium">{item.value}</dd>
              </div>
            ))}
            {!!service.resources?.length && (
              <div className="col-span-2 border-t border-border pt-4">
                <dt className="text-xs text-muted-foreground">
                  Recursos vinculados
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {service.resources.map((resource) => (
                    <span
                      key={resource.id}
                      className="rounded-lg bg-muted px-2.5 py-1 text-xs"
                    >
                      {resource.name}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </PanelTA>
      </div>
      <ServiceInsightsTA serviceId={service.id} />
      <PanelTA
        title="Galería del servicio"
        description={`${gallery.length} elementos · imágenes y videos del resultado`}
        action={
          <ButtonTA
            size="sm"
            variant="outline"
            onClick={() => navigate(`/admin/services/${service.id}/edit`)}
          >
            Editar galería
          </ButtonTA>
        }
      >
        <div className="px-5 pb-5 sm:px-6">
          {gallery.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {gallery.map((item, index) => (
                <figure key={index}>
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      controls
                      preload="metadata"
                      aria-label={item.caption || `Video ${index + 1}`}
                      className="aspect-video w-full rounded-xl bg-muted object-contain"
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={
                        item.caption || `Resultado del servicio ${index + 1}`
                      }
                      loading="lazy"
                      decoding="async"
                      className="aspect-video w-full rounded-xl bg-muted object-contain"
                    />
                  )}
                  {item.caption && (
                    <figcaption className="mt-2 text-xs text-muted-foreground">
                      {item.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          ) : (
            <StateTA
              title="Muestra lo que hace especial este servicio"
              description="Agrega imágenes y videos desde la edición del servicio."
            />
          )}
        </div>
      </PanelTA>
    </div>
  );
};
