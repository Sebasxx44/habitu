import { ReservationSupportTA } from "@/modules/reservation-support/components/ReservationSupportTA";
import { useTranslation } from "react-i18next";
import { brand } from '@/config/brand'
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Clock,
  MapPin,
  MessageSquarePlus,
  Phone,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CancelModal } from "@/components/cliente/CancelModal";
import { RescheduleModal } from "@/components/cliente/RescheduleModal";
import { ReviewModal } from "@/components/cliente/ReviewModal";
import { ShopsMap } from "@/components/ShopsMap";
import { useAppointmentDetail } from "@/composables/appointments/useAppointmentDetail";
import { downloadBookingCalendar } from "@/composables/booking/calendar";
import {
  bookingLongDate,
  bookingMoney,
} from "@/components/cliente/booking/BookingStepsTA";
import { statusLabel } from "@/modules/dashboard/formatters";

// CONSTANTS
const paymentLabels: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  COMPLETED: "Completado",
  PARTIAL: "Pago parcial",
  REFUNDED: "Reembolsado",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
};

// COMPONENT
export const AppointmentDetailPage = () => {
  const { i18n } = useTranslation();
  const english = i18n.language.startsWith('en');
  const { id } = useParams();
  const navigate = useNavigate();
  const { detail, selection, actions } = useAppointmentDetail(Number(id));
  const appointment = detail.data;
  if (detail.loading && !appointment)
    return (
      <div
        className="mx-auto max-w-6xl space-y-5"
        role="status"
        aria-label="Cargando detalle de cita"
      >
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    );
  if (!appointment || detail.error)
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <ButtonTA
          variant="ghost"
          render={<Link to="/cliente/appointments" />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" /> Mis citas
        </ButtonTA>
        <StateTA
          error
          title="Cita no disponible"
          description={detail.error ?? "No encontramos la cita solicitada."}
          onRetry={actions.reload}
        />
      </div>
    );
  const business = appointment.business ?? appointment.barberShop;
  const professional = appointment.professional ?? appointment.barber;
  const branch = appointment.branch;
  const address = branch?.address ?? business?.address;
  const phone = branch?.phone ?? business?.phone;
  const currency = appointment.currency ?? "COP";
  const timezone = appointment.timezone ?? "America/Bogota";
  const duration =
    appointment.duration_minutes ??
    appointment.service?.duration_minutes ??
    appointment.service?.duration;
  const latitude = branch?.lat ?? business?.lat;
  const longitude = branch?.lng ?? business?.lng;
  const mapped =
    business &&
    latitude != null &&
    longitude != null &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude));
  const allowed = appointment.allowed_actions;
  const calendar = () =>
    downloadBookingCalendar(
      appointment.id,
      appointment.date,
      appointment.time,
      duration ?? 1,
      `${appointment.service?.name ?? "Cita"} · ${business?.name ?? brand.name}`,
      timezone,
    );
  const rebook = () => {
    if (!business) return;
    const params = new URLSearchParams({
      book: "1",
      service_id: String(appointment.service_id),
    });
    if (appointment.professional_id)
      params.set("professional_id", String(appointment.professional_id));
    if (appointment.branch_id)
      params.set("branch_id", String(appointment.branch_id));
    if (appointment.resource_id) params.set("resource_id", String(appointment.resource_id));
    if (appointment.duration_minutes) params.set("duration_minutes", String(appointment.duration_minutes));
    if (appointment.participants) params.set("participants", String(appointment.participants));
    navigate(`/cliente/business/${business.id}?${params}`);
  };
  return (
    <div className="page-enter mx-auto max-w-6xl space-y-7 pb-8">
      <ButtonTA
        variant="ghost"
        className="-ml-3"
        render={<Link to="/cliente/appointments" />}
        nativeButton={false}
      >
        <ArrowLeft className="size-4" /> Mis citas
      </ButtonTA>
      <ActionHeaderTA
        eyebrow={appointment.booking_code ?? `Cita ${appointment.id}`}
        title={appointment.service?.name ?? "Tu reserva"}
        description={business?.name}
        actions={
          <>
            <Badge className="rounded-full px-3 py-1.5" variant="secondary">
              {statusLabel(appointment.status)}
            </Badge>
            <ButtonTA
              variant="ghost"
              onClick={actions.reload}
              disabled={detail.loading}
              aria-label="Actualizar cita"
            >
              <RefreshCw className="size-4" />
            </ButtonTA>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
              Tu momento
            </p>
            <p className="mt-3 text-2xl font-semibold capitalize tracking-tight sm:text-3xl">
              {bookingLongDate(appointment.date)}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                {appointment.time}
                {duration != null && ` · ${duration} minutos`}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" />
                {timezone}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {!["CANCELADA", "NO_ASISTIO"].includes(appointment.status) && (
                <ButtonTA variant="outline" onClick={calendar}>
                  <CalendarPlus className="size-4" /> Agregar al calendario
                </ButtonTA>
              )}
              {allowed?.reschedule && (
                <ButtonTA
                  variant="outline"
                  onClick={() => selection.choose("reschedule")}
                >
                  <RefreshCw className="size-4" /> Reprogramar
                </ButtonTA>
              )}
              {allowed?.cancel && (
                <ButtonTA
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => selection.choose("cancel")}
                >
                  <X className="size-4" /> Cancelar cita
                </ButtonTA>
              )}
            </div>
          </section>
          <PanelTA title="La experiencia">
            <div className="space-y-5 px-5 pb-6 sm:px-6">
              <div>
                <p className="font-semibold">
                  {appointment.service?.name ?? "Servicio archivado"}
                </p>
                {appointment.service?.description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {appointment.service.description}
                  </p>
                )}
              </div>
              {professional && (
                <div className="flex items-center gap-4 border-t border-border pt-5">
                  {professional.photo_url ? (
                    <img
                      src={professional.photo_url}
                      alt=""
                      className="size-14 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid size-14 place-items-center rounded-full bg-secondary">
                      <UserRound className="size-6 text-muted-foreground" />
                    </span>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Tu profesional
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {professional.name}
                    </p>
                    {professional.specialty && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {professional.specialty}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {appointment.resource && (
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    Espacio reservado:{" "}
                  </span>
                  {appointment.resource.name}
                </p>
              )}
              {appointment.notes && (
                <div className="rounded-xl bg-secondary/50 p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Tus indicaciones
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {appointment.notes}
                  </p>
                </div>
              )}
            </div>
          </PanelTA>
          <PanelTA
            title={business?.name ?? "Establecimiento"}
            description={branch?.name}
          >
            <div className="space-y-4 px-5 pb-6 sm:px-6">
              <p className="flex gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                {address ?? "Dirección no publicada"}
              </p>
              {mapped && (
                <div className="h-60 overflow-hidden rounded-2xl border border-border">
                  <ShopsMap
                    shops={[{ ...business, lat: latitude, lng: longitude }]}
                    onOpenShop={() =>
                      navigate(`/cliente/business/${business.id}`)
                    }
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {address && (
                  <ButtonTA
                    variant="outline"
                    render={
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                      />
                    }
                    nativeButton={false}
                  >
                    <MapPin className="size-4" /> Cómo llegar
                  </ButtonTA>
                )}
                {phone && (
                  <ButtonTA
                    variant="outline"
                    render={<a href={`tel:${phone}`} />}
                    nativeButton={false}
                  >
                    <Phone className="size-4" /> Contactar
                  </ButtonTA>
                )}
                {business && (
                  <ButtonTA
                    variant="ghost"
                    render={<Link to={`/cliente/business/${business.id}`} />}
                    nativeButton={false}
                  >
                    Ver establecimiento <ArrowRight className="size-4" />
                  </ButtonTA>
                )}
              </div>
            </div>
          </PanelTA>
          <div className="flex flex-wrap gap-2">
            {appointment.booking_model === 'resource' && <ButtonTA variant="outline" render={<Link to={`/cliente/groups?appointment_id=${appointment.id}`} />} nativeButton={false}>{english ? 'Organize a group' : 'Organizar en grupo'}</ButtonTA>}
            <ButtonTA variant="outline" render={<Link to={`/cliente/routines?appointment_id=${appointment.id}`} />} nativeButton={false}>{english ? 'Plan a routine' : 'Planear una rutina'}</ButtonTA>
          </div>
          <ReservationSupportTA key={appointment.id} kind="appointment" id={appointment.id} />
          <PanelTA
            title="Historial de tu reserva"
            description="Eventos registrados para esta cita."
          >
            {appointment.timeline.length ? (
              <ol className="space-y-5 px-5 pb-6 sm:px-6">
                {appointment.timeline.map((event) => (
                  <li
                    key={event.id}
                    className="relative border-l border-border pl-5"
                  >
                    <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-primary" />
                    <p className="text-sm font-medium">{event.title}</p>
                    {event.description && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                    <time
                      dateTime={event.created_at}
                      className="mt-2 block text-[11px] text-muted-foreground"
                    >
                      {new Intl.DateTimeFormat("es-CO", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: timezone,
                      }).format(new Date(event.created_at))}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <StateTA
                title="Sin eventos adicionales"
                description="Las novedades de esta cita aparecerán aquí cuando se registren."
              />
            )}
          </PanelTA>
        </div>
        <aside className="space-y-6">
          <PanelTA
            title="Importe y pago"
            description={
              paymentLabels[appointment.payment_status ?? ""] ??
              appointment.payment_status ??
              "Estado de pago no disponible"
            }
          >
            <div className="space-y-4 px-5 pb-6 sm:px-6">
              <dl className="space-y-3">
                <div className="flex justify-between gap-3 text-sm text-muted-foreground">
                  <dt>Servicio</dt>
                  <dd>
                    {bookingMoney(
                      appointment.base_price ?? appointment.price,
                      currency,
                    )}
                  </dd>
                </div>
                {Number(appointment.discount_amount) > 0 && (
                  <div className="flex justify-between gap-3 text-sm text-primary">
                    <dt>Descuento</dt>
                    <dd>
                      −
                      {bookingMoney(appointment.discount_amount ?? 0, currency)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 border-t border-border pt-3 font-semibold">
                  <dt>Total</dt>
                  <dd>
                    {bookingMoney(
                      appointment.final_price ?? appointment.price,
                      currency,
                    )}
                  </dd>
                </div>
              </dl>
              {appointment.payments.length ? (
                <div className="space-y-3 border-t border-border pt-4">
                  <h3 className="text-xs font-semibold text-muted-foreground">
                    Pagos registrados
                  </h3>
                  {appointment.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-xl bg-secondary/40 p-3"
                    >
                      <div className="flex justify-between gap-3 text-sm">
                        <span>{payment.method}</span>
                        <span className="font-medium">
                          {bookingMoney(payment.amount, payment.currency)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {paymentLabels[payment.status] ?? payment.status}
                        {payment.paid_at
                          ? ` · ${new Date(payment.paid_at).toLocaleDateString("es-CO")}`
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  No hay transacciones de pago registradas para esta cita.
                </p>
              )}
            </div>
          </PanelTA>
          {(allowed?.review || allowed?.rebook) && (
            <PanelTA
              title={
                appointment.status === "COMPLETADA"
                  ? "¿Cómo fue tu experiencia?"
                  : "Tu próxima visita"
              }
            >
              <div className="space-y-3 px-5 pb-6 sm:px-6">
                {allowed.review && (
                  <ButtonTA
                    className="w-full"
                    onClick={() => selection.choose("review")}
                  >
                    <MessageSquarePlus className="size-4" /> Compartir reseña
                  </ButtonTA>
                )}
                {appointment.review_id && (
                  <p className="text-sm text-muted-foreground">
                    Gracias por compartir tu reseña.
                  </p>
                )}
                {allowed.rebook && business && (
                  <ButtonTA
                    className="w-full"
                    variant="outline"
                    onClick={rebook}
                  >
                    Volver a reservar <ArrowRight className="size-4" />
                  </ButtonTA>
                )}
              </div>
            </PanelTA>
          )}
        </aside>
      </div>
      {selection.modal === "cancel" && (
        <CancelModal
          appointment={appointment}
          onClose={() => selection.choose(null)}
          onSubmit={actions.cancel}
        />
      )}
      {selection.modal === "reschedule" && (
        <RescheduleModal
          appointment={appointment}
          onClose={() => selection.choose(null)}
          onSubmit={actions.reschedule}
        />
      )}
      {selection.modal === "review" && (
        <ReviewModal
          appointment={appointment}
          onClose={() => selection.choose(null)}
          onSubmit={actions.review}
        />
      )}
    </div>
  );
};
