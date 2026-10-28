import { CalendarDays, Check, Clock, Sparkles, UserRound, MapPin, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { InputTA } from '@/components/TA/InputTA'
import { StateTA } from '@/components/TA/StateTA'
import { Skeleton } from '@/components/ui/skeleton'
import { AvailabilityAlertTA } from '@/modules/marketplace/components/AvailabilityAlertTA'
import { formatCurrency, formatDate, formatTime } from '@/i18n/formatters'
import { discoveryDay } from '@/modules/discovery/query'
import type { BookingBranch, BookingFlowState, BookingService } from '@/composables/booking/types'
import { cn } from '@/lib/utils'

// HELPERS
export const bookingMoney = (value: number | string, currency = 'COP'): string => formatCurrency(Number(value), currency)
export const bookingLongDate = (value: string): string => formatDate(value.slice(0, 10), { weekday: 'long', day: 'numeric', month: 'long', year: undefined })
const optionClass = (active: boolean): string => cn('relative min-w-0 rounded-2xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary', active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:border-primary/50')

// COMPONENTS
export const BookingServiceStepTA = ({ flow, services, branches }: { flow: BookingFlowState; services: BookingService[]; branches: BookingBranch[] }) => {
  const { t } = useTranslation('marketplace')
  return <div className="space-y-5">
    {branches.length > 1 && <label className="block space-y-2 text-sm font-medium">{t('booking.branch')}<select value={flow.selection.branchId ?? ''} onChange={(event) => flow.actions.branch(Number(event.target.value))} className="h-12 w-full rounded-xl border border-input bg-background px-3">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} · {branch.address}</option>)}</select></label>}
    {!services.length ? <StateTA title={t('booking.noServices')} description={t('booking.noServicesDetail')} /> : <div className="grid gap-3 sm:grid-cols-2">{services.filter((service) => service.is_active !== false).map((service) => <button key={service.id} className={optionClass(flow.selection.serviceId === service.id)} onClick={() => flow.actions.service(service.id)} aria-pressed={flow.selection.serviceId === service.id}>
      <div className="flex items-start justify-between gap-3"><p className="font-semibold">{service.name}</p>{flow.selection.serviceId === service.id && <Check className="size-4 shrink-0 text-primary" />}</div>
      {service.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{service.description}</p>}
      <div className="mt-5 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3.5" />{t('booking.minutes', { count: service.duration_minutes ?? service.duration })}</span><span className="text-sm font-semibold">{bookingMoney(service.price, service.currency)}</span></div>
    </button>)}</div>}
  </div>
}

export const BookingProfessionalStepTA = ({ flow }: { flow: BookingFlowState }) => {
  const { t } = useTranslation('marketplace')
  const optional = flow.journey.model !== 'professional'
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">{t('booking.chooseProfessional')}</p>
    <button className={cn(optionClass(flow.selection.professionalId === null), 'flex w-full items-center gap-4')} onClick={() => flow.actions.professional(null)} aria-pressed={flow.selection.professionalId === null}><span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Sparkles className="size-5" /></span><span><span className="block text-sm font-semibold">{t(optional ? 'booking.optionalProfessional' : 'booking.anyProfessional')}</span><span className="mt-1 block text-xs text-muted-foreground">{t(optional ? 'booking.optionalProfessionalDetail' : 'booking.anyProfessionalDetail')}</span></span></button>
    {!flow.journey.professionals.length && !optional ? <StateTA title={t('booking.noProfessionals')} description={t('booking.noProfessionalsDetail')} /> : <div className="grid gap-3 sm:grid-cols-2">{flow.journey.professionals.map((professional) => <button className={cn(optionClass(flow.selection.professionalId === professional.id), 'flex items-center gap-3')} key={professional.id} onClick={() => flow.actions.professional(professional.id)} aria-pressed={flow.selection.professionalId === professional.id}>
      {professional.photo_url ? <img src={professional.photo_url} alt="" loading="lazy" className="size-12 shrink-0 rounded-full object-cover" /> : <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary"><UserRound className="size-5 text-muted-foreground" /></span>}
      <span><span className="block text-sm font-semibold">{professional.name}</span>{professional.specialty && <span className="mt-1 block text-xs text-muted-foreground">{professional.specialty}</span>}</span>
    </button>)}</div>}
  </div>
}

export const BookingResourceStepTA = ({ flow }: { flow: BookingFlowState }) => {
  const { t } = useTranslation('marketplace')
  return <fieldset className="space-y-3"><legend className="mb-2 text-sm font-semibold">{t('booking.resourceTitle')}</legend>
    {!flow.journey.resources.length ? <StateTA title={t('booking.noResources')} description={t('booking.noResourcesDetail')} /> : <>
      {flow.journey.resources.length > 1 && <ButtonTA variant={flow.selection.resourceId === null ? 'secondary' : 'outline'} onClick={() => flow.actions.resource(null)} aria-pressed={flow.selection.resourceId === null}><MapPin className="size-4" />{t('booking.anyResource')}</ButtonTA>}
      <div className={cn("grid gap-3", flow.journey.resources.length > 1 && "sm:grid-cols-2")}>{flow.journey.resources.map((resource) => <button key={resource.id} onClick={() => flow.actions.resource(resource.id)} aria-pressed={flow.selection.resourceId === resource.id} className={optionClass(flow.selection.resourceId === resource.id)}>
        {resource.image_url && <img src={resource.image_url} alt="" loading="lazy" className="mb-3 aspect-[2/1] w-full rounded-xl object-cover" />}
        <p className="text-sm font-semibold">{resource.name}</p>{resource.description && <p className="mt-1 text-xs text-muted-foreground">{resource.description}</p>}
        {resource.attributes && <p className="mt-2 text-xs text-primary">{[resource.attributes.sport_type ? t(`discovery.${resource.attributes.sport_type}`, { defaultValue: resource.attributes.sport_type }) : '', resource.attributes.surface ? t(`discovery.${resource.attributes.surface}`, { defaultValue: resource.attributes.surface }) : '', resource.attributes.covered === true ? t('discovery.covered') : resource.attributes.covered === false ? t('discovery.outdoor') : ''].filter(Boolean).join(' · ')}</p>}
      </button>)}</div>
    </>}
  </fieldset>
}

export const BookingDateStepTA = ({ flow }: { flow: BookingFlowState }) => {
  const { t } = useTranslation('marketplace')
  const today = discoveryDay()
  const maxDate = flow.journey.service?.max_advance_days != null ? discoveryDay(flow.journey.service.max_advance_days) : undefined
  const days = Array.from({ length: 7 }, (_, index) => ({ value: discoveryDay(index), label: index < 2 ? t(index ? 'booking.tomorrow' : 'booking.today') : formatDate(discoveryDay(index), { weekday: 'short', year: undefined, month: undefined, day: undefined }), day: Number(discoveryDay(index).slice(-2)) })).filter(day => !maxDate || day.value <= maxDate)
  const slots = [...new Map(flow.availability.slots.filter((slot) => slot.available).map((slot) => [`${slot.start_time.slice(0, 5)}:${flow.journey.requiresResource ? slot.resource_id ?? '' : ''}`, slot])).values()]
  const groups = [{ title: t('booking.morning'), min: 0, max: 12 }, { title: t('booking.afternoon'), min: 12, max: 18 }, { title: t('booking.evening'), min: 18, max: 24 }]
  return <div className="space-y-6">
    {flow.journey.requiresResource && <BookingResourceStepTA flow={flow} />}
    {flow.journey.durations.length > 1 && <fieldset><legend className="mb-3 text-sm font-semibold">{t('booking.duration')}</legend><div className="flex flex-wrap gap-2">{flow.journey.durations.map(duration => <ButtonTA key={duration} variant={flow.selection.durationMinutes === duration ? 'default' : 'outline'} aria-pressed={flow.selection.durationMinutes === duration} onClick={() => flow.actions.duration(duration)}>{t('booking.minutes', { count: duration })}</ButtonTA>)}</div></fieldset>}
    {flow.journey.model === 'capacity' && <label className="flex items-center gap-3 text-sm font-semibold"><Users className="size-4 text-primary" />{t('booking.participants')}<InputTA aria-label={t('booking.participants')} className="ml-auto w-24" type="number" min={1} max={flow.journey.service?.booking_capacity ?? 1} value={flow.selection.participants} onChange={(event) => flow.actions.participants(Number(event.target.value) || 1)} /></label>}
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{days.map((date) => <button key={date.value} className={cn(optionClass(flow.selection.date === date.value), 'px-2 py-3 text-center')} onClick={() => flow.actions.date(date.value)} aria-pressed={flow.selection.date === date.value}><span className="block text-[11px] capitalize">{date.label}</span><span className="mt-1 block text-lg font-semibold">{date.day}</span></button>)}</div>
    <label className="flex flex-wrap items-center gap-3 text-sm font-medium"><CalendarDays className="size-4 text-muted-foreground" />{t('booking.otherDate')}<InputTA type="date" className="w-auto flex-1 sm:max-w-[220px]" min={today} max={maxDate} value={flow.selection.date} onChange={(event) => flow.actions.date(event.target.value)} /></label>
    <div><p className="text-sm font-semibold">{t('booking.chooseTime')}</p><p className="mt-1 text-xs text-muted-foreground">{t('booking.businessTime', { timezone: flow.availability.timezone })}</p></div>
    {flow.availability.loading ? <div className="grid grid-cols-3 gap-2" role="status" aria-label={t('booking.loading')}>{[1, 2, 3, 4, 5, 6].map(item => <Skeleton key={item} className="h-12 rounded-xl" />)}</div> : flow.availability.error ? <StateTA error title={t('booking.unavailable')} description={flow.availability.error} onRetry={flow.actions.reloadAvailability} /> : !slots.length ? <><StateTA title={t('booking.empty')} description={t('booking.emptyDetail')} /><AvailabilityAlertTA request={flow.journey.request} /></> : <div className="space-y-5">{groups.map(group => {
      const times = slots.filter(slot => Number(slot.start_time.slice(0, 2)) >= group.min && Number(slot.start_time.slice(0, 2)) < group.max)
      return times.length ? <fieldset key={group.title}><legend className="mb-2 text-xs font-medium text-muted-foreground">{group.title}</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{times.map(slot => {
        const selected = flow.selection.time === slot.start_time.slice(0, 5) && (!flow.selection.resourceId || flow.selection.resourceId === slot.resource_id)
        return <ButtonTA key={`${slot.start_time}:${slot.resource_id ?? ''}`} variant={selected ? 'default' : 'outline'} className="h-auto min-h-12 flex-col gap-1 py-3" aria-pressed={selected} onClick={() => flow.actions.time(slot.start_time.slice(0, 5), slot.resource_id)}><span>{formatTime(slot.start_time)}</span>{slot.resource_name && <span className="max-w-full truncate text-[10px] font-normal">{slot.resource_name}</span>}{flow.journey.model === 'capacity' && slot.remaining_capacity != null && <span className="text-[10px] font-normal">{t('booking.seats', { count: slot.remaining_capacity })}</span>}</ButtonTA>
      })}</div></fieldset> : null
    })}</div>}
  </div>
}
