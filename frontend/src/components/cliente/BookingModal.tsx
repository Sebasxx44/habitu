import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { trackMarketplaceEvent } from '@/modules/analytics/tracking'
import { ArrowLeft, ArrowRight, CalendarPlus, Check, MapPin, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/App'
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { PremiumModal } from '@/components/premium/PremiumModal'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { BookingServiceStepTA, BookingProfessionalStepTA, BookingDateStepTA, bookingLongDate, bookingMoney } from '@/components/cliente/booking/BookingStepsTA'
import { BookingSummaryTA } from '@/components/cliente/booking/BookingSummaryTA'
import { useBookingSelection } from '@/composables/booking/useBookingSelection'
import { useBookingCheckout } from '@/composables/booking/useBookingCheckout'
import { downloadBookingCalendar } from '@/composables/booking/calendar'
import type { BookingBranch, BookingBusiness, BookingContext, BookingProfessional, BookingService, BookingStep } from '@/composables/booking/types'
import type { Resource } from '@/types/models'
import { statusLabels } from '@/modules/dashboard/formatters'
import { cn } from '@/lib/utils'

// TYPES
interface BookingModalProps {
  open: boolean
  onClose: () => void
  shop: BookingBusiness
  professionals: BookingProfessional[]
  services: BookingService[]
  resources: Resource[]
  initialContext?: BookingContext
}

// CONSTANTS
const labels: Record<BookingStep, string> = { service: 'booking.service', professional: 'booking.professional', datetime: 'booking.datetime', review: 'booking.review' }
const shortLabels: Record<BookingStep, string> = { service: 'booking.serviceShort', professional: 'booking.professionalShort', datetime: 'booking.datetimeShort', review: 'booking.reviewShort' }

// COMPONENT
const BookingFlow = ({ onClose, shop, professionals, services, resources, initialContext }: Omit<BookingModalProps, 'open'>) => {
  const { t } = useTranslation('marketplace')
  const trackingId = useRef(crypto.randomUUID())
  const navigate = useNavigate()
  const { user, permissions } = useAuth()
  const flow = useBookingSelection(shop, services, professionals, resources, initialContext)
  const slot = flow.journey.selectedSlot
  const quoteRequest = flow.journey.step === 'review' && flow.journey.request && slot ? { ...flow.journey.request, duration_minutes: slot.duration_minutes, start_time: slot.start_time.slice(0, 5), professional_id: slot.professional_id ?? flow.journey.request.professional_id, resource_id: slot.resource_id ?? flow.journey.request.resource_id } : null
  const checkout = useBookingCheckout(quoteRequest, initialContext?.promoCode ?? '', flow.actions.reloadAvailability)
  const { appointment, submitting } = checkout.submission
  useEffect(() => { void trackMarketplaceEvent('booking_start', { source: initialContext?.source, business_id: shop.id, service_id: flow.selection.serviceId ?? undefined, dedupe_key: trackingId.current }) }, [shop.id, flow.selection.serviceId, initialContext?.source])
  useEffect(() => { if (slot) void trackMarketplaceEvent('slot_selected', { source: initialContext?.source, business_id: shop.id, service_id: flow.selection.serviceId ?? undefined, dedupe_key: `${trackingId.current}:${flow.selection.date}:${slot.start_time}:${slot.resource_id ?? ''}` }) }, [slot, shop.id, flow.selection.serviceId, flow.selection.date, initialContext?.source])
  useEffect(() => { if (appointment) void trackMarketplaceEvent('booking_confirmed', { source: initialContext?.source, business_id: shop.id, service_id: flow.selection.serviceId ?? undefined, appointment_id: appointment.id, dedupe_key: String(appointment.id) }) }, [appointment, shop.id, flow.selection.serviceId, initialContext?.source])
  const branches: BookingBranch[] = (shop.branches?.length ? shop.branches : [shop.main_branch ?? shop.mainBranch].filter((branch): branch is BookingBranch => !!branch)).filter((branch) => branch.is_active !== false)
  const canBook = user?.role === 'SUPERADMIN' || permissions.includes('appointments.create')
  const close = () => { if (!submitting) onClose() }
  const address = appointment?.branch?.address ?? flow.journey.branch?.address ?? shop.address
  const calendar = () => {
    if (!appointment) return
    downloadBookingCalendar(appointment.id, appointment.date.slice(0, 10), (appointment.start_time || appointment.time || flow.selection.time).slice(0, 5), checkout.summary.quote?.duration_minutes ?? flow.journey.service?.duration_minutes ?? flow.journey.service?.duration ?? 1, `${appointment.service?.name ?? flow.journey.service?.name} · ${shop.name}`, appointment.timezone ?? checkout.summary.quote?.timezone ?? flow.availability.timezone)
  }

  return <PremiumModal open onOpenChange={(open) => { if (!open) close() }} padding={false} showCloseButton={false} maxWidth="sm:max-w-3xl" className="w-[calc(100%-1rem)] rounded-3xl border-border sm:rounded-3xl" contentClassName="flex min-h-0 flex-col overflow-hidden p-0">
    <DialogTitle className="sr-only">{t(appointment ? 'booking.created' : 'booking.title')}</DialogTitle><DialogDescription className="sr-only">{t('booking.description')}</DialogDescription>
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-8"><p className="truncate text-sm font-medium">{shop.name}</p><ButtonTA variant="ghost" size="icon" aria-label={t('booking.close')} disabled={submitting} onClick={close}><X className="size-5" /></ButtonTA></div>
    {appointment ? <div className="min-h-0 space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-8">
      <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Check className="size-7" /></div>
      <ActionHeaderTA eyebrow={t('booking.nextPlan')} title={appointment.status === 'CONFIRMED' || appointment.status === 'CONFIRMADA' ? t('booking.confirmedTitle') : t('booking.successTitle')} description={t('booking.successDescription')} />
      <div className="rounded-2xl border border-border bg-secondary/30 p-5"><p className="text-xs text-muted-foreground">{t('booking.code')}</p><p className="mt-1 text-xl font-semibold tracking-wide">{appointment.booking_code || `Cita ${appointment.id}`}</p><p className="mt-4 font-semibold">{appointment.service?.name ?? flow.journey.service?.name}</p><p className="mt-1 text-sm text-muted-foreground">{appointment.professional?.name ?? checkout.summary.quote?.professional?.name ?? flow.journey.resource?.name}</p><p className="mt-4 text-sm capitalize">{bookingLongDate(appointment.date.slice(0, 10))} · {(appointment.start_time || appointment.time || flow.selection.time).slice(0, 5)}</p><p className="mt-2 text-sm text-muted-foreground">{address}</p><div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-border pt-4"><span className="text-sm">{statusLabels[appointment.status ?? ''] ?? appointment.status ?? 'Creada'}</span>{appointment.final_price != null && <span className="font-semibold">{bookingMoney(appointment.final_price, appointment.currency ?? checkout.summary.quote?.currency)}</span>}</div></div>
      <ButtonTA className="w-full" onClick={() => { onClose(); navigate(`/cliente/appointments/${appointment.id}`) }}>{t('booking.view')} <ArrowRight className="size-4" /></ButtonTA>
      <div className="flex flex-wrap gap-2"><ButtonTA variant="outline" className="flex-1" onClick={calendar}><CalendarPlus className="size-4" /> {t('booking.calendar')}</ButtonTA>{address && <ButtonTA variant="outline" className="flex-1"  render={<a target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} />} nativeButton={false}><MapPin className="size-4" /> {t('booking.map')}</ButtonTA>}</div>
    </div> : <>
      <div className="min-h-0 space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-8">
        <nav aria-label={t('booking.steps')} className="flex items-center gap-2">{flow.journey.steps.map((step, index) => <button key={step} disabled={index > flow.journey.index || submitting} aria-current={step === flow.journey.step ? 'step' : undefined} onClick={() => flow.actions.step(step)} className={cn('flex min-h-10 flex-1 items-center gap-2 rounded-lg text-left text-[11px] sm:text-xs', step === flow.journey.step ? 'font-semibold text-primary' : 'text-muted-foreground')}><span className={cn('grid size-6 shrink-0 place-items-center rounded-full border text-[10px]', index <= flow.journey.index ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>{index < flow.journey.index ? <Check className="size-3" /> : index + 1}</span><span>{t(step === 'datetime' && flow.journey.requiresResource ? 'booking.resourceShort' : shortLabels[step])}</span></button>)}</nav>
        <ActionHeaderTA title={t(flow.journey.step === 'datetime' && flow.journey.requiresResource ? 'booking.resource' : labels[flow.journey.step])} description={t(flow.journey.step === 'review' ? 'booking.summaryDescription' : 'booking.stepDescription')} />
        {flow.notice && <p role="status" className="rounded-xl border border-border bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">{t('booking.invalidContext')}</p>}
        {flow.journey.step === 'service' && <BookingServiceStepTA flow={flow} services={services} branches={branches} />}
        {flow.journey.step === 'professional' && <BookingProfessionalStepTA flow={flow} />}
        {flow.journey.step === 'datetime' && <BookingDateStepTA flow={flow} />}
        {flow.journey.step === 'review' && <BookingSummaryTA business={shop} flow={flow} checkout={checkout} />}
        {!canBook && <p role="alert" className="text-sm text-destructive">{t('booking.noPermission')}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-8">{flow.journey.index > 0 && <ButtonTA variant="outline" disabled={submitting} onClick={flow.actions.back}><ArrowLeft className="size-4" /><span className="sr-only sm:not-sr-only">{t('booking.back')}</span></ButtonTA>}<div className="min-w-0 flex-1">{flow.journey.service && <><p className="truncate text-xs font-medium">{flow.journey.service.name}</p><p className="mt-1 text-xs text-muted-foreground">{flow.journey.step === 'review' && checkout.summary.quote ? bookingMoney(checkout.summary.quote.total, checkout.summary.quote.currency) : t('booking.minutes', { count: slot?.duration_minutes ?? flow.selection.durationMinutes })}</p></>}</div>{flow.journey.step === 'review' ? <ButtonTA disabled={!canBook || !checkout.summary.quote || !checkout.payment.ready || checkout.summary.loading || submitting || !!appointment} onClick={() => void checkout.actions.confirm()}>{t(submitting ? 'booking.confirming' : 'booking.confirm')}</ButtonTA> : <ButtonTA disabled={!flow.journey.canContinue || submitting} onClick={flow.actions.next}>{t('booking.next')} <ArrowRight className="size-4" /></ButtonTA>}</div>
    </>}
  </PremiumModal>
}

export const BookingModal = ({ open, ...props }: BookingModalProps) => open ? <BookingFlow {...props} /> : null
