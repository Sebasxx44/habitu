import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Clock3, MapPin, UserRound } from 'lucide-react'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { InputTA } from '@/components/TA/InputTA'
import { AvailabilitySlotsTA } from '@/modules/marketplace/components/AvailabilitySlotsTA'
import { assistantBookingLink } from '@/modules/assistant/bookingLink'
import { discoveryDay } from '@/modules/discovery/query'
import { formatCurrency, formatDate } from '@/i18n/formatters'
import { trackMarketplaceEvent } from '@/modules/analytics/tracking'
import type { AssistantCard, AssistantContext } from '@/modules/assistant/types'

// COMPONENT
export const AssistantResultTA = ({ card, busy, onAvailability }: { card: AssistantCard; busy: boolean; onAvailability: (context: AssistantContext) => void }) => {
  const { t, i18n } = useTranslation('marketplace')
  const english = i18n.language.startsWith('en')
  const { t: growth } = useTranslation('growth')
  const [expired, setExpired] = useState(!!card.expires_at && Date.parse(card.expires_at) <= Date.now())
  useEffect(() => {
    if (!card.expires_at) return
    const remaining = Date.parse(card.expires_at) - Date.now()
    setExpired(remaining <= 0)
    const timer = setTimeout(() => setExpired(true), Math.max(0, remaining))
    return () => clearTimeout(timer)
  }, [card.expires_at])
  const [date, setDate] = useState(card.date ?? discoveryDay())
  const context = { business_id: card.business_id, branch_id: card.branch_id, service_id: card.service_id, duration_minutes: card.duration_minutes, participants: card.participants, ...(card.professional_id ? { professional_id: card.professional_id } : {}), ...(card.resource_id ? { resource_id: card.resource_id } : {}) }
  const click = () => void trackMarketplaceEvent('assistant_click', { source: 'assistant', business_id: card.business_id, service_id: card.service_id })
  if (card.appointment_id) return <article className="space-y-3 rounded-2xl border border-border bg-card p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{card.business_name}</p><h3 className="text-sm font-semibold">{card.service_name}</h3><p className="text-xs text-muted-foreground">{card.date && formatDate(card.date)} {card.time}</p>{(card.resource_name || card.professional_name) && <p className="text-xs text-muted-foreground">{card.resource_name || card.professional_name}</p>}{card.prepared_action && <p className="text-xs text-muted-foreground">{english ? 'Review the current price, schedule and conditions before confirming any change.' : 'Revisa precio, horario y condiciones vigentes antes de confirmar cualquier cambio.'}</p>}{!!card.proposed_slots?.length && !expired && <div><p className="text-xs font-medium">{english ? 'Alternatives to review' : 'Alternativas para revisar'}</p><ul className="mt-1 space-y-1 text-xs text-muted-foreground">{card.proposed_slots.map(slot => <li key={slot.start_time}>{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} · {formatCurrency(slot.price, card.currency)}</li>)}</ul></div>}{expired && <p role="status" className="text-xs text-primary">{growth('expired')}</p>}<ButtonTA render={<Link to={card.url || `/cliente/appointments/${card.appointment_id}`} onClick={click} />} nativeButton={false} variant="outline" className="w-full">{card.prepared_action === 'review_reschedule' ? (english ? 'Review rescheduling' : 'Revisar reprogramación') : card.prepared_action === 'review_cancellation' ? (english ? 'Review cancellation' : 'Revisar cancelación') : t('concierge.viewBooking')}<ArrowUpRight className="size-3.5" /></ButtonTA></article>
  return <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{card.business_name}</p><h3 className="mt-1 text-sm font-semibold">{card.service_name}</h3></div><div className="text-right">{card.discounted_price != null && card.original_price != null && card.discounted_price < card.original_price && <del className="block text-[10px] text-muted-foreground">{formatCurrency(card.original_price, card.currency)}</del>}<strong className="text-sm">{formatCurrency(card.discounted_price ?? card.price, card.currency)}</strong></div></div>
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3" />{t('booking.minutes', { count: card.duration_minutes })}{card.professional_name && <><span>·</span><UserRound className="size-3" />{card.professional_name}</>}{card.resource_name && <> · {card.resource_name}</>}</p>
    <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 size-3 shrink-0" />{card.address || card.branch_name}</p>
    {card.promotion && <div className="mt-3 rounded-xl bg-primary/5 px-3 py-2"><p className="text-xs font-medium text-primary">{card.promotion.title}{card.promotion.code && <span className="ml-1">· {card.promotion.code}</span>}</p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{t('concierge.conditions')}</p></div>}
    {card.date && <p className="mb-2 mt-4 text-xs font-medium">{formatDate(card.date, { weekday: 'long', year: undefined })}</p>}
    {card.checked_at && <p className="mt-3 text-[11px] text-muted-foreground">{growth("proposalExpiry", { time: new Date(card.checked_at).toLocaleTimeString() })}</p>}
    {expired && <p role="status" className="mt-2 text-xs text-primary">{growth("expired")}</p>}
    {!!card.slots.length && !expired && card.date && <AvailabilitySlotsTA slots={card.slots.map(slot => ({ ...slot, available: true }))} context={{ businessId: card.business_id, branchId: card.branch_id, serviceId: card.service_id, date: card.date, source: 'assistant', promoCode: card.promotion?.code, durationMinutes: card.duration_minutes, participants: card.participants }} />}
    <div className="mt-4 flex flex-wrap gap-2">{[0, 1].map(offset => <ButtonTA key={offset} variant="ghost" className="min-h-9 px-2 text-xs" disabled={busy} onClick={() => onAvailability({ ...context, date: discoveryDay(offset) })}>{t(offset ? 'booking.tomorrow' : 'booking.today')}</ButtonTA>)}</div>
    <label className="mt-2 block text-xs text-muted-foreground">{t('concierge.changeDate')}<div className="mt-1 flex gap-2"><InputTA type="date" min={discoveryDay()} value={date} onChange={event => setDate(event.target.value)} /><ButtonTA variant="outline" disabled={busy || !date} onClick={() => onAvailability({ ...context, date })}><Clock3 className="size-4" /><span className="sr-only">{t('concierge.availability')}</span></ButtonTA></div></label>
    <div className="mt-4 flex flex-wrap gap-2"><ButtonTA className="flex-1 text-xs" disabled={expired} render={<Link to={assistantBookingLink(card)} onClick={click} />} nativeButton={false}>{t('concierge.book')}<ArrowUpRight className="size-3.5" /></ButtonTA><ButtonTA variant="outline" aria-label={t('concierge.map')} render={<a target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.address || card.business_name)}`} />} nativeButton={false}><MapPin className="size-4" /></ButtonTA></div>
  </article>
}
