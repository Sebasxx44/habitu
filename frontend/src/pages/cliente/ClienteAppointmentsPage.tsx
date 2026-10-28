import { CalendarDays, Clock, MapPin, MessageSquarePlus, Plus, RefreshCw, X, Heart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { PanelTA } from '@/components/TA/PanelTA'
import { StateTA } from '@/components/TA/StateTA'
import { Badge } from '@/components/ui/badge'
import { SkeletonTA } from '@/components/TA/SkeletonTA'
import { ReviewModal } from '@/components/cliente/ReviewModal'
import { RescheduleModal } from '@/components/cliente/RescheduleModal'
import { CancelModal } from '@/components/cliente/CancelModal'
import { useClientAppointments } from '@/composables/useClientAppointments'
import { useDashboardOverview } from '@/modules/dashboard/composables/useDashboardOverview'
import type { AppointmentView } from '@/composables/appointments/types'
import { DateRangeFilterTA } from '@/components/TA/DateRangeFilterTA'
import { formatDate, formatTime } from '@/utils/dateUtils'
import { formatCurrency } from '@/i18n/formatters'
import { cn } from '@/lib/utils'

// CONSTANTS
const tabs: { value: AppointmentView; label: string }[] = [{ value: 'upcoming', label: 'Próximas' }, { value: 'completed', label: 'Completadas' }, { value: 'cancelled', label: 'Canceladas y ausencias' }]

// COMPONENT
export const ClienteAppointmentsPage = () => {
  const navigate = useNavigate()
  const { overview, filters: period } = useDashboardOverview()
  const { list, filters, selection, actions } = useClientAppointments(period.range, overview.refresh)
  const loyalty = overview.data?.loyalty.cards[0]

  return (
    <div className="space-y-7 pb-10">
      <ActionHeaderTA icon={CalendarDays} eyebrow="Tu agenda" title="Mis citas" description="Tus próximos planes y el historial de tus visitas." actions={<ButtonTA onClick={() => navigate('/cliente/explore')}><Plus className="size-4" /> Nueva cita</ButtonTA>} />
      <section className="surface-card p-4 sm:p-5"><DateRangeFilterTA value={period.range} onChange={period.setRange} /></section>
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-secondary p-1" role="tablist" aria-label="Estado de las citas">
              {tabs.map(tab => <button key={tab.value} role="tab" aria-selected={filters.view === tab.value} onClick={() => filters.setView(tab.value)} className={cn('min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium focus-visible:outline focus-visible:outline-primary', filters.view === tab.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{tab.label}</button>)}
            </div>
            <ButtonTA variant="ghost" onClick={list.refresh} aria-label="Actualizar citas"><RefreshCw className={cn('size-4', list.loading && 'animate-spin')} /></ButtonTA>
          </div>
          {filters.view !== 'upcoming' && <p className="text-sm text-muted-foreground">Historial del {formatDate(period.range.start)} al {formatDate(period.range.end)}.</p>}
          {list.loading ? <SkeletonTA variant="list" count={3} label="Cargando citas" />
            : list.error ? <StateTA error title="No pudimos cargar tus citas" description={list.error} onRetry={list.refresh} />
              : list.data.length === 0 ? <StateTA title={filters.view === 'upcoming' ? 'Tu agenda está libre' : 'Sin citas en este período'} description={filters.view === 'upcoming' ? 'Explora tus negocios favoritos y reserva tu próximo servicio.' : 'Cambia el período para consultar otras visitas.'} />
                : <div className="space-y-4">{list.data.map((appointment, index) => (
                  <article key={appointment.id} className={cn('surface-card rounded-2xl border bg-card p-5 md:p-6', filters.view === 'upcoming' && index === 0 && filters.page === 1 ? 'border-primary/30 bg-primary/5 shadow-[var(--shadow-soft)]' : 'border-border')}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="text-xs text-muted-foreground">{appointment.booking_code || `Cita ${appointment.id}`}</p><h2 className="mt-1 text-lg font-semibold tracking-tight">{appointment.service?.name || 'Servicio'}</h2><p className="mt-1 text-sm text-muted-foreground">{appointment.barber?.name || 'Equipo del negocio'}</p></div>
                      <div className="text-right"><Badge variant="secondary">{appointment.status.replace(/_/g, ' ')}</Badge><p className="mt-2 text-sm font-semibold">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: appointment.currency || 'COP' }).format(appointment.price)}</p></div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4" />{formatDate(appointment.date)}</span><span className="inline-flex items-center gap-2"><Clock className="size-4" />{formatTime(appointment.time)}</span><span className="inline-flex items-center gap-2"><MapPin className="size-4" />{appointment.barberShop?.name || 'Negocio'}</span></div>
                    <p className="mt-2 text-xs text-muted-foreground">{appointment.branch?.address || appointment.barberShop?.address}</p>
                    <ButtonTA className="mt-4" variant="outline" onClick={() => navigate(`/cliente/appointments/${appointment.id}`)}>Ver detalle</ButtonTA>
                    {(appointment.allowed_actions?.cancel || appointment.allowed_actions?.reschedule) && <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">{appointment.allowed_actions?.reschedule && <ButtonTA variant="outline" onClick={() => selection.selectReschedule(appointment)}><RefreshCw className="size-4" /> Reprogramar</ButtonTA>}{appointment.allowed_actions?.cancel && <ButtonTA variant="ghost" className="text-destructive" onClick={() => selection.selectCancel(appointment)}><X className="size-4" /> Cancelar</ButtonTA>}</div>}
                    {(appointment.allowed_actions?.review || appointment.review_id) && <div className="mt-5 border-t border-border pt-4">{appointment.review_id ? <p className="text-sm text-muted-foreground">Reseña enviada. Gracias por compartir tu experiencia.</p> : <ButtonTA variant="outline" onClick={() => selection.selectReview(appointment)}><MessageSquarePlus className="size-4" /> Escribir reseña</ButtonTA>}</div>}
                  </article>
                ))}</div>}
          {!list.loading && !list.error && list.total > 0 && <nav aria-label="Paginación de citas" className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="text-sm text-muted-foreground">Página {filters.page} de {list.lastPage} · {list.total} citas</p><div className="flex gap-2"><ButtonTA variant="outline" disabled={filters.page <= 1} onClick={() => filters.setPage(filters.page - 1)}>Anterior</ButtonTA><ButtonTA variant="outline" disabled={filters.page >= list.lastPage} onClick={() => filters.setPage(filters.page + 1)}>Siguiente</ButtonTA></div></nav>}
        </div>
        <aside className="space-y-5">
          <PanelTA icon={CalendarDays} title="Tu actividad" description="Actividad calculada desde tu historial.">
            <div className="px-5 pb-5 md:px-6"><p className="text-xs text-muted-foreground">Resumen del período seleccionado. Las próximas citas y tus recompensas muestran su estado actual.</p>
              {overview.loading ? <SkeletonTA variant="text" count={4} className="mt-5" label="Cargando tu actividad" /> : overview.error ? <StateTA error title="Resumen no disponible" description={overview.error} onRetry={overview.refresh} /> : <dl className="mt-5 divide-y divide-border">{overview.data?.metrics.slice(0, 4).map(metric => <div key={metric.id} className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-muted-foreground">{metric.label}</dt><dd className="font-semibold tabular-nums">{metric.unit === 'currency' ? formatCurrency(metric.value, overview.data?.currency ?? 'COP') : `${metric.value}${metric.unit === 'percent' ? '%' : ''}`}</dd></div>)}</dl>}
            </div>
          </PanelTA>
          {loyalty && <PanelTA tone="accent" icon={Heart} title={loyalty.name} description={loyalty.business}><div className="space-y-3 px-5 pb-5 md:px-6"><p className="text-sm">{loyalty.available ? 'Tienes una recompensa disponible.' : `${loyalty.stamps} de ${loyalty.required} sellos`}</p><progress aria-label="Progreso de recompensas" value={loyalty.stamps} max={Math.max(1, loyalty.required)} className="h-2 w-full accent-primary" /><p className="text-xs text-muted-foreground">{loyalty.reward}</p></div></PanelTA>}
          <ButtonTA variant="outline" className="w-full" onClick={() => navigate('/cliente/favorites')}><Heart className="size-4" /> Mis favoritos</ButtonTA>
        </aside>
      </div>
      {selection.review && <ReviewModal appointment={selection.review} onClose={() => selection.selectReview(null)} onSubmit={actions.submitReview} />}
      {selection.reschedule && <RescheduleModal appointment={selection.reschedule} onClose={() => selection.selectReschedule(null)} onSubmit={actions.reschedule} />}
      {selection.cancel && <CancelModal appointment={selection.cancel} onClose={() => selection.selectCancel(null)} onSubmit={actions.cancel} />}
    </div>
  )
}
