import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  DollarSign,
  Pencil,
  Percent,
  Trash2,
} from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { DateRangeFilterTA } from "@/components/TA/DateRangeFilterTA";
import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import {
  ProfessionalAvatarTA,
  ProfessionalContactTA,
  ProfessionalMetricTA,
  ProfessionalStatusTA,
  appointmentStatus,
  professionalCurrency,
  professionalDate,
} from "@/modules/professionals/ProfessionalPrimitivesTA";
import { useProfessionalProfile } from "@/modules/professionals/useProfessionalProfile";

// COMPONENT
export const ProfessionalDetailTA = ({ id }: { id: number }) => {
  // COMPOSABLES
  const { profile, analysis } = useProfessionalProfile(id);
  const professional = profile.value;
  const dashboard = analysis.value;
  const currencies = [...new Set([analysis.currency || dashboard?.currency || "COP", ...(dashboard?.currencies ?? [])])];

  // RENDER
  if (profile.loading && !professional)
    return (
      <StateTA
        title="Cargando profesional"
        description="Estamos recuperando su perfil y actividad."
      />
    );
  if (profile.error || !professional)
    return (
      <div className="space-y-4">
        <ButtonTA
          variant="outline"
          nativeButton={false}
          render={<Link to="/admin/professionals" />}
        >
          <ArrowLeft />
          Volver al equipo
        </ButtonTA>
        <StateTA
          error
          title="No pudimos abrir este perfil"
          description={profile.error || "El profesional no está disponible."}
          onRetry={() => void profile.reload()}
        />
      </div>
    );
  return (
    <div className="space-y-6 pb-8">
      <ButtonTA
        variant="ghost"
        className="-ml-3"
        nativeButton={false}
        render={<Link to="/admin/professionals" />}
      >
        <ArrowLeft />
        Volver al equipo
      </ButtonTA>
      <ActionHeaderTA
        eyebrow="Profesionales · Perfil"
        title={professional.name}
        description={professional.specialty || "Profesional de tu equipo"}
        actions={
          <>
            <ButtonTA
              variant="outline"
              nativeButton={false}
              render={<Link to={`/admin/calendar?professional_id=${id}`} />}
            >
              <CalendarDays />
              Ver agenda
            </ButtonTA>
            <ButtonTA
              nativeButton={false}
              render={<Link to={`/admin/professionals/${id}/edit`} />}
            >
              <Pencil />
              Editar perfil
            </ButtonTA>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <PanelTA title="Perfil profesional">
            <div className="space-y-5 px-5 pb-6 md:px-6">
              <div className="flex items-center gap-4">
                <ProfessionalAvatarTA
                  name={professional.name}
                  photo={professional.photo_url}
                  large
                />
                <ProfessionalStatusTA active={professional.is_active} />
              </div>
              <ProfessionalContactTA professional={professional} />
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  Acerca del profesional
                </p>
                <p className="whitespace-pre-line break-words text-sm leading-relaxed">
                  {professional.bio || "Aún no se ha agregado una biografía."}
                </p>
              </div>
              <dl className="space-y-3 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Comisión</dt>
                  <dd className="font-semibold">
                    {professional.commission_percentage ?? 0}%
                  </dd>
                </div>
                {professional.created_at && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">
                      En el equipo desde
                    </dt>
                    <dd>{professionalDate(professional.created_at)}</dd>
                  </div>
                )}
              </dl>
              <ButtonTA
                variant="outline"
                className="w-full"
                nativeButton={false}
                render={<Link to={`/admin/professionals/${id}/availability`} />}
              >
                <Clock3 />
                Consultar horarios
              </ButtonTA>
            </div>
          </PanelTA>
          <PanelTA
            title="Servicios asignados"
            description={`${professional.services.length} servicios vinculados al perfil`}
          >
            <div className="space-y-3 px-5 pb-6 md:px-6">
              {professional.services.length ? (
                professional.services.map((service) => (
                  <Link
                    key={service.id}
                    className="flex justify-between gap-3 rounded-xl border border-border p-3 text-sm hover:border-primary/40"
                    to={`/admin/services/${service.id}`}
                  >
                    <span>
                      <span className="block font-medium">{service.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {service.duration_minutes} min
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold">
                      {professionalCurrency(service.price, service.currency)}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin servicios vinculados a este profesional.
                </p>
              )}
            </div>
          </PanelTA>
          <ButtonTA
            variant="ghost"
            className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive"
            nativeButton={false}
            render={<Link to={`/admin/professionals/${id}/delete`} />}
          >
            <Trash2 />
            Gestionar baja del profesional
          </ButtonTA>
        </aside>
        <div className="min-w-0 space-y-6">
          <PanelTA
            title="Actividad del profesional"
            description="Las cifras se calculan con las reservas del período seleccionado."
          >
            <div className="px-5 pb-5 md:px-6"><DateRangeFilterTA value={analysis.range} onChange={analysis.setRange} />
              {currencies.length > 1 && <label className="mt-3 block text-xs text-muted-foreground">Moneda del análisis<select className="ml-3 h-11 rounded-xl border border-border bg-background px-3" value={analysis.currency || dashboard?.currency} onChange={(event) => analysis.setCurrency(event.target.value)}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label>}
            </div>
          </PanelTA>
          {analysis.invalidRange ? (
            <p
              role="alert"
              className="rounded-xl bg-destructive/5 p-4 text-sm text-destructive"
            >
              Selecciona un rango de fechas válido.
            </p>
          ) : analysis.loading ? (
            <StateTA
              title="Actualizando actividad"
              description="Consultando las reservas del período."
            />
          ) : analysis.error ? (
            <StateTA
              error
              title="La actividad no está disponible"
              description={analysis.error}
              onRetry={() => void analysis.reload()}
            />
          ) : (
            dashboard && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <ProfessionalMetricTA
                    label="Valor realizado"
                    value={professionalCurrency(dashboard.stats.monthRevenue, dashboard.currency)}
                    caption="Reservas completadas del período"
                    icon={<DollarSign />}
                  />
                  <ProfessionalMetricTA
                    label="Reservas del período"
                    value={dashboard.stats.monthAppointments}
                    caption="Todos los estados"
                    icon={<CalendarDays />}
                  />
                  <ProfessionalMetricTA
                    label="Citas para hoy"
                    value={dashboard.stats.todayAppointments}
                    caption="Agenda del día actual"
                    icon={<Clock3 />}
                  />
                  <ProfessionalMetricTA
                    label="Citas de esta semana"
                    value={dashboard.stats.weekAppointments}
                    caption="Semana actual"
                    icon={<Percent />}
                  />
                </div>
                <InteractiveChartTA title="Valor realizado por día" description="Valor de reservas completadas durante el período; no representa el abono al profesional." currency={dashboard.currency} initialType="bar"
                  data={dashboard.dailyIncome.map((day) => ({ label: day.label, values: { income: Number(day.income) } }))}
                  series={[{ key: "income", label: "Valor realizado", format: "currency" }]} labelFormatter={professionalDate} />
                <div className="grid gap-5 lg:grid-cols-2">
                  <InteractiveChartTA title="Servicios completados" description="Distribución real durante el período." initialType="bar" allowedTypes={["bar", "pie", "table"]}
                    data={dashboard.serviceBreakdown.map((item) => ({ label: item.name, values: { count: Number(item.value) } }))} series={[{ key: "count", label: "Servicios" }]} />
                  <InteractiveChartTA title="Estado de las reservas" description="Todas las reservas del período seleccionado." initialType="pie" allowedTypes={["bar", "pie", "table"]}
                    data={dashboard.statusBreakdown.map((item) => ({ label: appointmentStatus(item.name), values: { count: Number(item.value) } }))} series={[{ key: "count", label: "Reservas" }]} />
                </div>
                <PanelTA
                  title="Historial de reservas"
                  description="Las 20 reservas más recientes del período seleccionado."
                >
                  {dashboard.recentAppointments.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left text-sm">
                        <thead className="border-y border-border bg-secondary/30 text-xs text-muted-foreground">
                          <tr>
                            <th className="px-5 py-3 font-medium">
                              Cliente y servicio
                            </th>
                            <th className="px-4 py-3 font-medium">
                              Fecha y hora
                            </th>
                            <th className="px-4 py-3 font-medium">Valor</th>
                            <th className="px-4 py-3 font-medium">Estado</th>
                            <th className="px-4 py-3 font-medium">
                              <span className="sr-only">Acciones</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {dashboard.recentAppointments.map((appointment) => (
                            <tr key={appointment.id}>
                              <td className="px-5 py-4">
                                {appointment.client ? (
                                  <Link
                                    to={`/admin/clients/${appointment.client.id}`}
                                    className="font-medium hover:text-primary hover:underline"
                                  >
                                    {appointment.client.name}
                                  </Link>
                                ) : (
                                  <span>Cliente sin información</span>
                                )}
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {appointment.service?.name ||
                                    "Servicio no disponible"}
                                </p>
                              </td>
                              <td className="px-4 py-4">
                                <p>{professionalDate(appointment.date)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {(
                                    appointment.start_time ??
                                    appointment.time ??
                                    ""
                                  ).slice(0, 5)}
                                </p>
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 font-medium">
                                {professionalCurrency(
                                  appointment.final_price ?? appointment.price,
                                  appointment.currency,
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <span className="whitespace-nowrap rounded-full bg-secondary px-2.5 py-1 text-xs">
                                  {appointmentStatus(appointment.status)}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <ButtonTA
                                  nativeButton={false}
                                  render={
                                    <Link
                                      to={`/admin/calendar/${appointment.id}`}
                                    />
                                  }
                                  variant="ghost"
                                  size="sm"
                                >
                                  Ver reserva
                                </ButtonTA>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <StateTA
                      title="Sin reservas en estas fechas"
                      description="Amplía el período para consultar más actividad."
                    />
                  )}
                </PanelTA>
              </>
            )
          )}
          <PanelTA
            title="Portafolio"
            description="Trabajos publicados por el profesional."
          >
            {professional.portfolios.length ? (
              <div className="grid grid-cols-2 gap-4 px-5 pb-6 md:px-6 lg:grid-cols-3">
                {professional.portfolios.map((item) => (
                  <figure
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-border"
                  >
                    <a
                      href={item.image_url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir imagen: ${item.title || "Trabajo del profesional"}`}
                    >
                      <img
                        src={item.image_url}
                        alt={item.title || "Trabajo del profesional"}
                        className="aspect-square w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                    <figcaption className="p-3">
                      <p className="text-sm font-medium">
                        {item.title || "Trabajo del profesional"}
                      </p>
                      {item.description && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="px-5 pb-6 text-sm text-muted-foreground md:px-6">
                El profesional aún no ha publicado trabajos en su portafolio.
              </div>
            )}
          </PanelTA>
        </div>
      </div>
    </div>
  );
};
