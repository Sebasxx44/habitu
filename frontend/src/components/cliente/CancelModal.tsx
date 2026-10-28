import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { CalendarDays, Check, Clock, X } from 'lucide-react'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { PremiumModal } from '@/components/premium/PremiumModal'
import type { BookingApiError, BookingAppointment } from '@/composables/booking/types'
import { formatDate, formatTime } from '@/utils/dateUtils'

// TYPES
interface CancelModalProps { appointment: BookingAppointment; onClose: () => void; onSubmit: (reason: string) => Promise<BookingAppointment | null> }

// CONSTANTS
const reasons = ['No podré asistir', 'Cambio de horario', 'Prefiero otro servicio', 'Otro motivo']

// COMPONENT
export const CancelModal = ({ appointment, onClose, onSubmit }: CancelModalProps) => {
  // STATE
  const navigate = useNavigate()
  const [reason, setReason] = useState(reasons[0])
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)

  // ACTIONS
  const submit = async () => {
    if (pending.current) return
    pending.current = true
    setSubmitting(true)
    setError(null)
    try {
      const result = await onSubmit(detail.trim() ? `${reason}: ${detail.trim()}` : reason)
      if (!result) throw new Error('No se pudo cancelar la cita.')
      setCancelled(true)
    } catch (error) {
      const response = isAxiosError<BookingApiError>(error) ? error.response?.data : undefined
      const validation = response?.errors ? Object.values(response.errors).flat()[0] : undefined
      setError(validation || response?.error || response?.message || 'No se pudo cancelar. Tu cita conserva su estado anterior.')
    } finally { pending.current = false; setSubmitting(false) }
  }

  // RENDER
  return (
    <PremiumModal open onOpenChange={open => { if (!open && !submitting) onClose() }} title={cancelled ? 'Cita cancelada' : 'Cancelar cita'} description={cancelled ? 'La cancelación quedó registrada en tu historial.' : 'Indica el motivo y confirma la cancelación.'} maxWidth="sm:max-w-xl" showCloseButton={false}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-secondary/40 p-4"><p className="text-xs text-muted-foreground">{appointment.booking_code || `Cita ${appointment.id}`}</p><p className="mt-1 font-semibold">{appointment.service?.name || 'Servicio'}</p><p className="mt-1 text-sm text-muted-foreground">{appointment.barber?.name || appointment.professional?.name}</p><div className="mt-4 flex flex-wrap gap-4 text-sm"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4" />{formatDate(appointment.date)}</span><span className="inline-flex items-center gap-2"><Clock className="size-4" />{formatTime(appointment.time || appointment.start_time)}</span></div></div>
        {cancelled ? <><p role="status" className="flex items-center gap-2 text-sm"><Check className="size-5 text-primary" /> Tu cita ya no ocupa este horario.</p><ButtonTA className="w-full" onClick={() => { onClose(); navigate('/cliente/dashboard') }}>Agendar otra cita</ButtonTA><ButtonTA variant="outline" className="w-full" onClick={onClose}>Volver a mis citas</ButtonTA></> : <>
          <fieldset disabled={submitting} className="space-y-3"><legend className="mb-3 text-sm font-medium">Motivo de cancelación</legend>{reasons.map(option => <label key={option} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3 text-sm"><input type="radio" name="cancel-reason" value={option} checked={reason === option} onChange={() => setReason(option)} className="accent-primary" />{option}</label>)}</fieldset>
          <div><label htmlFor="cancel-detail" className="text-sm font-medium">Más detalles <span className="font-normal text-muted-foreground">(opcional)</span></label><textarea id="cancel-detail" rows={3} maxLength={450} disabled={submitting} value={detail} onChange={event => setDetail(event.target.value)} className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm focus-visible:outline focus-visible:outline-primary" /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-3"><ButtonTA variant="outline" className="flex-1" disabled={submitting} onClick={onClose}>Conservar cita</ButtonTA><ButtonTA className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={submitting} onClick={() => { void submit() }}><X className="size-4" />{submitting ? 'Cancelando…' : 'Confirmar cancelación'}</ButtonTA></div>
        </>}
      </div>
    </PremiumModal>
  )
}
