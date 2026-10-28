import { useRef, useState } from 'react'
import { useAuth } from '@/App'
import { isAxiosError } from 'axios'
import { CalendarDays, Clock, MapPin, Phone, RefreshCw } from 'lucide-react'
import { useAppointmentDetail } from '@/composables/appointments/useAppointmentDetail'
import { AppointmentContextTA } from '@/modules/agenda/components/AppointmentContextTA'
import { InputTA } from '@/components/TA/InputTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { StateTA } from '@/components/TA/StateTA'
import { useBookingAvailability } from '@/composables/useBookingAvailability'
import { httpService } from '@/services/auth/authService'
import type { ClientAppointment } from '@/composables/appointments/types'
import type { BookingApiError } from '@/composables/booking/types'
import type { Professional } from '@/types/models'
import { formatDate, formatTime } from '@/utils/dateUtils'

// TYPES
interface DetailContentProps { appt: ClientAppointment; barbers: Professional[]; onClose: () => void; onStatusChange?: (id: number, status: string, reason?: string) => Promise<void> }

// COMPONENT
export const AppointmentDetailView = ({ appt: initial, barbers, onClose, onStatusChange }: DetailContentProps) => {
  // STATE
  const { user, permissions } = useAuth()
  const { detail, actions: detailActions } = useAppointmentDetail(initial.id)
  const appt = detail.data ?? initial
  const canManage = user?.role === 'SUPERADMIN' || permissions.includes('appointments.edit')
  const [rescheduling, setRescheduling] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [professional, setProfessional] = useState(String(appt.professional_id || appt.barber_id || ''))
  const [date, setDate] = useState(appt.date.slice(0, 10))
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  const active = !detail.loading && !detail.error && (appt.status === 'PENDIENTE' || appt.status === 'CONFIRMADA')
  const { availability, actions } = useBookingAvailability(rescheduling && appt.business_id && appt.branch_id && date ? {
    business_id: appt.business_id, branch_id: appt.branch_id, service_id: appt.service_id,
    professional_id: professional ? Number(professional) : undefined, resource_id: appt.resource_id,
    date, appointment_id: appt.id,
  } : null)
  const slots = availability.slots.filter(slot => slot.available)
  const staff = barbers.length ? barbers : appt.barber ? [appt.barber] : []

  // ACTIONS
  const save = async (status?: string) => {
    if (status === 'CANCELADA' && !cancelReason.trim()) { setError('Indica el motivo para cancelar la cita.'); return }
    if (!canManage || !onStatusChange || pending.current || (!status && !slots.some(slot => slot.start_time.slice(0, 5) === time))) return
    pending.current = true
    setSaving(true)
    setError(null)
    try {
      if (status) await onStatusChange?.(appt.id, status, status === 'CANCELADA' ? cancelReason.trim() : undefined)
      else {
        await httpService.post(`/v2/appointments/${appt.id}/reschedule`, { date, start_time: time, professional_id: professional ? Number(professional) : null })
        await onStatusChange?.(appt.id, '')
      }
      onClose()
    } catch (error) {
      const response = isAxiosError<BookingApiError>(error) ? error.response?.data : undefined
      const validation = response?.errors ? Object.values(response.errors).flat()[0] : undefined
      setError(validation || response?.error || response?.message || 'No se pudo guardar el cambio.')
      actions.reload()
    } finally { pending.current = false; setSaving(false) }
  }

  // RENDER
  return (
    <div className="space-y-6 p-6 md:p-8">
      <header><p className="text-xs text-muted-foreground">{appt.booking_code || `Cita ${appt.id}`}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">{appt.client?.name || 'Cliente'}</h2><p className="mt-1 text-sm text-muted-foreground">{appt.service?.name} · {appt.status}</p></header>
      <dl className="grid gap-4 rounded-2xl border border-border bg-secondary/30 p-4 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Fecha</dt><dd className="mt-1 flex items-center gap-2 text-sm"><CalendarDays className="size-4" />{formatDate(appt.date)}</dd></div><div><dt className="text-xs text-muted-foreground">Hora</dt><dd className="mt-1 flex items-center gap-2 text-sm"><Clock className="size-4" />{formatTime(appt.time)}</dd></div><div><dt className="text-xs text-muted-foreground">Profesional</dt><dd className="mt-1 text-sm">{appt.barber?.name || 'Sin profesional asignado'}</dd></div><div><dt className="text-xs text-muted-foreground">Valor del servicio</dt><dd className="mt-1 text-sm">{new Intl.NumberFormat("es-CO", { style: "currency", currency: appt.currency || "COP" }).format(appt.price)} · {appt.currency || "COP"}</dd></div></dl>
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" />{appt.branch?.name || appt.barberShop?.name || 'Negocio'} · {appt.branch?.address || appt.barberShop?.address || 'Sede de la reserva'}</p>
      {appt.client?.phone && <a className="inline-flex min-h-11 items-center gap-2 text-sm text-primary" href={`tel:${appt.client.phone.replace(/[^+0-9]/g, '')}`}><Phone className="size-4" />{appt.client.phone}</a>}
      <div className="grid grid-cols-3 gap-3 rounded-xl bg-secondary/30 p-4 text-xs"><div><p className="text-muted-foreground">Duración</p><p className="mt-1 font-semibold">{appt.duration_minutes ? `${appt.duration_minutes} min` : 'No especificada'}</p></div><div><p className="text-muted-foreground">Participantes</p><p className="mt-1 font-semibold">{appt.participants ?? 1}</p></div><div><p className="text-muted-foreground">Estado del pago</p><p className="mt-1 font-semibold">{appt.payment_status === 'PAID' ? 'Pagado' : appt.payment_status === 'PENDING' ? 'Pendiente' : appt.payment_status || 'Sin información'}</p></div></div>
      {detail.loading && <p role="status" className="text-sm text-muted-foreground">Actualizando detalle, notas y pagos…</p>}
      {detail.error && <StateTA error title="Detalle no disponible" description={detail.error} onRetry={detailActions.reload} />}
      {detail.data && <AppointmentContextTA key={appt.id} detail={detail.data} canEdit={canManage} onSaved={detailActions.reload} />}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {active && canManage && !!onStatusChange && <>
        {!rescheduling && !cancelling && <div className="flex flex-wrap gap-2">{appt.status === 'PENDIENTE' && <ButtonTA disabled={saving} onClick={() => { void save('CONFIRMADA') }}>Confirmar</ButtonTA>}<ButtonTA disabled={saving} variant="outline" onClick={() => { void save('COMPLETADA') }}>Completar</ButtonTA><ButtonTA disabled={saving} variant="outline" onClick={() => { void save('NO_ASISTIO') }}>No asistió</ButtonTA><ButtonTA disabled={saving} variant="outline" className="text-destructive" onClick={() => { setCancelling(true); setError(null) }}>Cancelar cita</ButtonTA></div>}
        {cancelling && <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4"><p className="text-sm font-semibold">Motivo de cancelación</p><p className="text-xs text-muted-foreground">La cita dejará libre el horario. Registra un motivo útil para su seguimiento.</p><InputTA aria-label="Motivo de cancelación" value={cancelReason} onChange={event => setCancelReason(event.target.value)} maxLength={500} disabled={saving} placeholder="Ej. El cliente solicita otro día" /><div className="flex gap-2"><ButtonTA variant="outline" disabled={saving} onClick={() => setCancelling(false)}>Conservar cita</ButtonTA><ButtonTA variant="destructive" disabled={saving || !cancelReason.trim()} onClick={() => { void save('CANCELADA') }}>Cancelar cita</ButtonTA></div></div>}
        {!cancelling && <ButtonTA disabled={saving} variant="outline" onClick={() => { if (!rescheduling) { setDate(appt.date.slice(0, 10)); setProfessional(String(appt.professional_id || appt.barber_id || '')); } setRescheduling(value => !value); setTime('') }}><RefreshCw className="size-4" />{rescheduling ? 'Conservar horario' : 'Reprogramar o reasignar'}</ButtonTA>}
        {rescheduling && <div className="space-y-4 border-t border-border pt-5"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Profesional<select value={professional} disabled={saving || staff.length === 0} onChange={event => { setProfessional(event.target.value); setTime('') }} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3"><option value="">Sin profesional</option>{staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label className="text-sm">Fecha<InputTA type="date" value={date} disabled={saving} onChange={event => { setDate(event.target.value); setTime('') }} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3" /></label></div>
          {availability.loading ? <p role="status" className="text-sm text-muted-foreground">Consultando disponibilidad…</p> : availability.error ? <StateTA error title="Horarios no disponibles" description={availability.error} onRetry={actions.reload} /> : slots.length ? <label className="block text-sm">Horario<select value={time} disabled={saving} onChange={event => setTime(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3"><option value="">Selecciona una hora</option>{slots.map(slot => <option key={slot.start_time} value={slot.start_time.slice(0, 5)}>{formatTime(slot.start_time)}</option>)}</select></label> : <StateTA title="Sin disponibilidad" description="Prueba otra fecha o profesional." />}
          <ButtonTA disabled={saving || availability.loading || !time || !slots.some(slot => slot.start_time.slice(0, 5) === time)} onClick={() => { void save() }}>{saving ? 'Guardando…' : 'Guardar nuevo horario'}</ButtonTA>
        </div>}
      </>}
      <ButtonTA variant="ghost" disabled={saving} onClick={onClose}>Cerrar</ButtonTA>
    </div>
  )
}
