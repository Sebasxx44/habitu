import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { useBookingAvailability } from '@/composables/useBookingAvailability'
import { bookingDate, downloadBookingCalendar } from '@/composables/booking/calendar'
import type { BookingApiError, BookingAppointment } from '@/composables/booking/types'
import { StateTA } from '@/components/TA/StateTA'
import { CalendarDays, Clock, Scissors, User, Check, X, ChevronLeft, ChevronRight, Mail, MapPin, CalendarCheck } from 'lucide-react'
import { ButtonTA as Button } from '@/components/TA/ButtonTA'
import { Badge } from '@/components/ui/badge'
import { PremiumModal } from '@/components/premium/PremiumModal'
import { formatDate, formatTime } from '@/utils/dateUtils'
import { cn } from '@/lib/utils'

interface RescheduleModalProps {
  appointment: BookingAppointment
  onClose: () => void
  onSubmit: (date: string, time: string) => Promise<BookingAppointment | null>
}

export const RescheduleModal = ({ appointment, onClose, onSubmit }: RescheduleModalProps) => {
  const getInitialDate = () => {
    if (!appointment?.date) return new Date()
    try {
      const dateOnly = appointment.date.split('T')[0].split(' ')[0]
      const d = new Date(`${dateOnly}T00:00:00`)
      return isNaN(d.getTime()) ? new Date() : d
    } catch {
      return new Date()
    }
  }

  const initialDate = getInitialDate()
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [updatedAppointment, setUpdatedAppointment] = useState<BookingAppointment | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submitting = useRef(false)
  const date = selectedDate ? bookingDate(selectedDate) : ''
  const businessId = appointment.business_id || appointment.barber_shop_id || appointment.barbershop_id
  const { availability, actions } = useBookingAvailability(date && businessId && appointment.branch_id ? {
    business_id: businessId, branch_id: appointment.branch_id, service_id: appointment.service_id,
    professional_id: appointment.professional_id || appointment.barber_id, resource_id: appointment.resource_id,
    date, appointment_id: appointment.id, duration_minutes: appointment.duration_minutes, participants: appointment.participants,
  } : null)
  const timeSlots = availability.slots.filter(slot => slot.available).map(slot => slot.start_time.slice(0, 5))
  const duration = appointment.duration_minutes ?? appointment.service?.duration_minutes ?? appointment.service?.duration
  useEffect(() => { setSelectedTime(null) }, [date])

  const handleReschedule = async () => {
    if (submitting.current || !selectedDate || !selectedTime || availability.loading || !timeSlots.includes(selectedTime)) return
    submitting.current = true
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const result = await onSubmit(bookingDate(selectedDate), selectedTime)
      if (result) {
        setUpdatedAppointment(result)
        setIsSuccess(true)
      } else {
        setSubmitError('No se pudo reprogramar. Selecciona un horario disponible e inténtalo otra vez.')
        actions.reload()
      }
    } catch (error) {
      const response = isAxiosError<BookingApiError>(error) ? error.response?.data : undefined
      const validation = response?.errors ? Object.values(response.errors).flat()[0] : undefined
      setSubmitError(validation || response?.error || response?.message || 'No se pudo reprogramar la cita.')
      actions.reload()
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  const handlePrevMonth = () => {
    setSelectedDate(prev => {
      const d = new Date(prev || new Date())
      d.setMonth(d.getMonth() - 1)
      return d
    })
  }

  const handleNextMonth = () => {
    setSelectedDate(prev => {
      const d = new Date(prev || new Date())
      d.setMonth(d.getMonth() + 1)
      return d
    })
  }

  const renderStepper = () => (
    <div className="flex items-center justify-center gap-3 px-4 sm:px-8 py-5 flex-wrap border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md shadow-primary/10 scale-110">1</div>
        <div>
          <p className="text-sm font-bold leading-tight">Reagendar cita</p>
          <p className="text-xs text-muted-foreground">Elige fecha y horario</p>
        </div>
      </div>
      <div className="flex-shrink-0 w-8 sm:w-16 border-t border-dashed border-border mx-2"></div>
      <div className="flex items-center gap-3 opacity-40">
        <div className="w-8 h-8 rounded-full border-2 border-border text-muted-foreground flex items-center justify-center font-bold text-sm">2</div>
        <div>
          <p className="text-sm font-bold leading-tight">Listo</p>
          <p className="text-xs text-muted-foreground">Cita confirmada</p>
        </div>
      </div>
    </div>
  )

  const renderSummaryCard = () => (
    <div className="m-6 p-4 rounded-2xl border border-border bg-card flex flex-col md:flex-row items-center gap-4 md:gap-8 justify-between shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary border border-border shrink-0">
          {appointment?.barber?.photo_url ? <img src={appointment.barber.photo_url} className="w-full h-full object-cover" /> : <User className="w-6 h-6 m-3 text-muted-foreground" />}
        </div>
        <div>
          <p className="font-bold text-sm flex items-center gap-1.5">{appointment?.barber?.name} <Check className="w-3.5 h-3.5 text-primary-foreground bg-primary rounded-full p-0.5" /></p>
          <p className="text-xs text-muted-foreground">{appointment?.barber?.specialty || 'Barbero Senior'}</p>
        </div>
      </div>

      <div className="hidden md:block w-px h-10 bg-border" />

      <div className="flex items-center gap-4 flex-1">
        <div className="w-10 h-10 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
          <Scissors className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-sm">{appointment?.service?.name}</p>
          <p className="text-xs text-muted-foreground">{duration ? `${duration} min` : 'Duración del servicio'}</p>
        </div>
      </div>

      <div className="hidden md:block w-px h-10 bg-border" />

      <div className="flex items-center gap-4 flex-1">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
          <CalendarDays className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Cita actual</p>
          <p className="text-sm font-bold">{formatDate(appointment?.date)} • {formatTime(appointment?.time)}</p>
        </div>
      </div>
    </div>
  )

  const renderCalendar = () => {
    const days = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
    
    const year = selectedDate?.getFullYear() ?? new Date().getFullYear()
    const month = selectedDate?.getMonth() ?? new Date().getMonth()
    
    // Calculate calendar grid
    const firstDay = new Date(year, month, 1).getDay()
    const offset = firstDay === 0 ? 6 : firstDay - 1 // Make Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    // We need exactly 6 rows of 7 to always keep the grid stable, or at least enough to cover
    const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7
    const dates = Array.from({ length: totalCells }, (_, i) => i - offset + 1)
    
    return (
      <div className="flex-1 space-y-4">
        <h3 className="font-bold text-sm mb-4">Selecciona una nueva fecha</h3>
        <div className="border border-border rounded-2xl p-4 bg-card shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button aria-label="Mes anterior" onClick={handlePrevMonth} className="p-1 hover:bg-secondary rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <p className="font-bold text-sm capitalize">{selectedDate ? selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : ''}</p>
            <button aria-label="Mes siguiente" onClick={handleNextMonth} className="p-1 hover:bg-secondary rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-y-4 text-center">
            {days.map(d => <div key={d} className="text-[10px] font-bold text-muted-foreground">{d}</div>)}
            {dates.map((d, i) => {
              if (d <= 0) return <div key={i} className="text-sm text-muted-foreground/20 font-medium py-1"></div>
              if (d > daysInMonth) return <div key={i} className="text-sm text-muted-foreground/20 font-medium py-1"></div>
              
              const isSelected = selectedDate?.getDate() === d
              return (
                <div key={i} className="flex justify-center relative">
                  <button 
                    disabled={bookingDate(new Date(year, month, d)) < new Intl.DateTimeFormat('en-CA', { timeZone: availability.timezone }).format(new Date())}
                    onClick={() => {
                      setSelectedDate(new Date(year, month, d))
                    }}
                    className={cn(
                    "w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-all",
                    isSelected ? "bg-primary text-primary-foreground shadow-md shadow-primary/10 scale-110" : "hover:bg-secondary text-foreground"
                  )}>
                    {d}
                  </button>
                  {isSelected && <div className="absolute -bottom-1 w-1 h-1 bg-secondary0 rounded-full" />}
                </div>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-2">
          <div className="w-2 h-2 rounded-full bg-secondary border border-primary" /> Fechas disponibles
        </div>
      </div>
    )
  }

  const renderTimeSlots = () => (
    <div className="flex-[1.5] space-y-4">
      <h3 className="font-bold text-sm mb-4">Selecciona un horario</h3>
      <div className="space-y-4">
        <p className="text-sm font-bold capitalize">{selectedDate ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</p>
        {availability.loading && <p role="status" className="py-3 text-sm text-muted-foreground">Consultando disponibilidad…</p>}
        {availability.error && <StateTA error title="No pudimos consultar horarios" description={availability.error} onRetry={actions.reload} />}
        {!availability.loading && !availability.error && timeSlots.length === 0 && <StateTA title="Sin horarios disponibles" description="Selecciona otra fecha para consultar la agenda." />}
        {submitError && <StateTA error title="No se pudo reprogramar" description={submitError} />}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {timeSlots.map((time) => (
            <button
              key={formatTime(time)}
              onClick={() => setSelectedTime(time)}
              className={cn(
                "h-10 rounded-xl text-xs font-bold transition-all border",
                selectedTime === time 
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/10" 
                  : "bg-card border-border hover:border-primary/50 hover:bg-secondary/50 text-foreground"
              )}
            >
              {formatTime(time)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
        <Clock className="w-3.5 h-3.5" /> Duración del servicio: {duration ? `${duration} min` : 'Duración del servicio'}
      </div>
    </div>
  )

  const renderSuccess = () => (
    <div className="px-4 sm:px-10 py-8 flex flex-col h-full">

      {/* Top: icon + title + code */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-4">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center border-4 border-card shadow-sm animate-in zoom-in-50 duration-500">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <div className="absolute top-0 right-0 w-2 h-2 bg-accent rotate-45 transform translate-x-5 -translate-y-2 animate-bounce" />
          <div className="absolute bottom-2 right-0 w-1.5 h-1.5 bg-primary rotate-12 transform translate-x-8 translate-y-2 animate-pulse" />
          <div className="absolute top-2 left-0 w-2 h-2 bg-blue-400 rotate-[30deg] transform -translate-x-7 -translate-y-1 animate-bounce" style={{ animationDelay: '200ms' }} />
          <div className="absolute -top-3 left-1/2 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-1">¡Cita reagendada con éxito!</h2>
        <p className="text-sm text-muted-foreground text-center mb-3">Tu cita ha sido actualizada correctamente.</p>
        <Badge variant="secondary" className="bg-secondary text-secondary-foreground hover:bg-secondary border-none font-medium px-4 py-1.5 text-sm gap-2">
          Código de reserva: <span className="font-bold">{updatedAppointment?.booking_code || appointment?.booking_code || `Cita ${appointment.id}`}</span>
        </Badge>
      </div>

      {/* Main 2-col grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

        {/* Left col: Details card */}
        <div className="border border-border rounded-2xl bg-card shadow-sm flex flex-col overflow-hidden">
          {/* Barber row */}
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-secondary border border-border shrink-0 flex items-center justify-center">
              {appointment?.barber?.photo_url
                ? <img src={appointment.barber.photo_url} className="w-full h-full object-cover" />
                : <User className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm flex items-center gap-1.5 truncate">
                {appointment?.barber?.name}
                <Check className="w-3.5 h-3.5 text-primary-foreground bg-primary rounded-full p-0.5 shrink-0" />
              </p>
              <p className="text-xs text-muted-foreground truncate">{appointment?.barber?.specialty || 'Barbero Senior'}</p>
            </div>
            <Badge variant="secondary" className="bg-secondary text-primary border-none font-bold text-[10px] shrink-0">Reagendada</Badge>
          </div>

          <div className="border-t border-border" />

          {/* Service row */}
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{appointment?.service?.name}</p>
              <p className="text-xs text-muted-foreground">{duration ? `${duration} min` : 'Duración del servicio'}</p>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Date + Time */}
          <div className="px-5 py-4 flex-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Nueva fecha y hora</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold">{formatDate(updatedAppointment?.date || selectedDate?.toISOString())}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold">{selectedTime ? formatTime(selectedTime) : ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right col: Barber shop + reminder + actions */}
        <div className="flex flex-col gap-4">
          {/* Barbershop */}
          <div className="border border-border rounded-2xl bg-card shadow-sm p-5">
            <p className="text-xs font-bold text-muted-foreground mb-3">Barbería</p>
            <div className="flex items-start gap-3 text-sm font-bold">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p>{appointment?.barberShop?.name || appointment.business?.name || 'Negocio'}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{appointment?.barberShop?.address || appointment.business?.address || 'Consulta la dirección en el perfil del negocio'}</p>
              </div>
            </div>
          </div>
          {/* Reminder */}
          <div className="bg-secondary border border-border rounded-2xl p-4 flex items-start gap-3">
            <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-secondary-foreground">Te esperamos 10 minutos antes de tu cita.</p>
              <p className="text-[10px] text-secondary-foreground mt-0.5">Si no puedes asistir, cancela o reagenda con al menos 2 horas de anticipación.</p>
            </div>
          </div>
          {/* Action buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Button variant="outline" className="h-10 rounded-xl font-bold text-xs px-2 bg-card text-foreground" disabled={!selectedTime || !duration} onClick={() => { if (selectedTime && duration) downloadBookingCalendar(appointment.id, date, selectedTime, duration, appointment.service?.name || 'Cita', availability.timezone) }}>
              <CalendarDays className="w-3.5 h-3.5 mr-1" /> Calendario
            </Button>
            <Button variant="outline" className="h-10 rounded-xl font-bold text-xs px-2 bg-card text-foreground" onClick={onClose}>
              <CalendarCheck className="w-3.5 h-3.5 mr-1" /> Mis citas
            </Button>
            <Button variant="outline" className="h-10 rounded-xl font-bold text-xs px-2 bg-card" disabled={!appointment.barberShop?.phone && !appointment.business?.phone} onClick={() => { const phone = appointment.barberShop?.phone || appointment.business?.phone; if (phone) window.location.href = `tel:${phone.replace(/[^+0-9]/g, '')}` }}>
              Contactar
            </Button>
          </div>
          {/* Close */}
          <Button className="h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm" onClick={onClose}>
            Cerrar
          </Button>
          <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 justify-center">
            <Mail className="w-3 h-3" /> Consulta los detalles actualizados en Mis citas.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <PremiumModal
      open={true}
      onOpenChange={(open) => { if (!open) onClose() }}
      maxWidth="sm:max-w-5xl"
      padding={false}
      showCloseButton={false}
    >
      <div className="relative flex flex-col max-h-[88vh] overflow-hidden">

        {/* Close button */}
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground z-10">
          <X className="w-5 h-5" />
        </button>

        {/* ---- STEP 1: Form ---- */}
        <div className={cn(
          "flex flex-col flex-1 min-h-0 transition-all duration-500 ease-in-out",
          isSuccess ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100"
        )}>
          <div className="px-8 pt-6 pb-4 flex items-center gap-2">
            <h2 className="text-xl font-bold">Reagendar cita</h2>
          </div>

          {renderStepper()}

          <div className="overflow-y-auto hide-scrollbar flex-1">
            {renderSummaryCard()}
            <div className="px-4 sm:px-8 pb-8 flex flex-col lg:flex-row gap-10">
              {renderCalendar()}
              {renderTimeSlots()}
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-card border-t border-border flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="flex items-center gap-3 bg-secondary border border-border px-4 py-3 rounded-2xl flex-1 w-full">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-bold text-secondary-foreground">Te esperamos 10 minutos antes de tu cita.</p>
                <p className="text-[10px] text-secondary-foreground mt-0.5">Si no puedes asistir, cancela o reagenda con al menos 2 horas de anticipación.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <Button variant="outline" className="h-12 flex-1 md:flex-none px-4 sm:px-8 rounded-xl font-bold border-border" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <Button className="h-12 flex-1 md:flex-none px-4 sm:px-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/10" onClick={handleReschedule} disabled={isSubmitting || availability.loading || !selectedTime || !timeSlots.includes(selectedTime)}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" /> Procesando...</span>
                ) : 'Reagendar'}
              </Button>
            </div>
          </div>
        </div>

        {/* ---- STEP 2: Success ---- */}
        <div className={cn(
          "flex flex-col flex-1 min-h-0 transition-all duration-700 ease-in-out",
          isSuccess ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none absolute inset-0"
        )}>
          {renderSuccess()}
        </div>

      </div>
    </PremiumModal>
  )
}
