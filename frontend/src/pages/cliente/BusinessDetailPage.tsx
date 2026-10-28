import { currentLocale, formatDate, formatNumber, formatTime } from '@/i18n/formatters'
import { useTranslation } from 'react-i18next'
import { t } from 'i18next'
import { ProviderChecksTA } from '@/modules/provider-reviews/components/ProviderChecksTA'
import { FavoriteButtonTA } from '@/modules/favorites/components/FavoriteButtonTA'
import { useServiceCatalog } from '@/modules/services/catalog/useServiceCatalog'
import { ServiceCatalogFilterTA } from '@/modules/services/catalog/ServiceCatalogFilterTA'
import { MediaGalleryTA } from '@/modules/media/MediaGalleryTA'
import { trackMarketplaceEvent } from '@/modules/analytics/tracking'
import { hasProfessionalChoice } from '@/composables/booking/policy'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Clock, MapPin, Phone, Sparkles, Star, Tag, UserRound } from 'lucide-react'
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { PanelTA } from '@/components/TA/PanelTA'
import { StateTA } from '@/components/TA/StateTA'
import { Skeleton } from '@/components/ui/skeleton'
import { BookingModal } from '@/components/cliente/BookingModal'
import { bookingMoney } from '@/components/cliente/booking/BookingStepsTA'
import { ShopsMap } from '@/components/ShopsMap'
import { useBusinessDetail } from '@/composables/businesses/useBusinessDetail'
import type { BookingContext } from '@/composables/booking/types'
import { cn } from '@/lib/utils'

// HELPERS
const identifier = (value: string | null): number | undefined => value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : undefined

// COMPONENT
export const BusinessDetailPage = () => {
  useTranslation()
  const { t: ui } = useTranslation('discoveryUi')
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { profile, actions } = useBusinessDetail(Number(id))
  const [booking, setBooking] = useState<BookingContext | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null)
  const [tab, setTab] = useState<'services' | 'team' | 'reviews' | 'location'>('services')
  const business = profile.data
  const services = business?.services?.filter((service) => service.is_active !== false) ?? []
  const serviceCatalog = useServiceCatalog(services, id)
  const professionals = business?.professionals?.filter((professional) => professional.is_active !== false) ?? []
  const branches = business?.branches?.filter((branch) => branch.is_active !== false) ?? []
  const branch = branches.find((item) => item.id === selectedBranch) ?? branches.find((item) => item.id === identifier(params.get('branch_id'))) ?? branches.find((item) => item.is_main_branch) ?? branches[0]
  const resources = business?.resources?.filter((resource) => resource.is_active !== false) ?? []
  const reviews = business?.reviews?.filter((review) => review.is_active !== false) ?? []
  const promotions = business?.promotions?.filter((promotion) => promotion.is_active) ?? []
  const gallery = [...new Set([business?.banner_url, ...(business?.gallery ?? [])].filter((url): url is string => !!url))]
  const initialContext: BookingContext = { serviceId: identifier(params.get('service_id')), professionalId: identifier(params.get('professional_id')), branchId: branch?.id, resourceId: identifier(params.get('resource_id')), date: params.get('date') ?? undefined, time: params.get('time') ?? undefined, promoCode: params.get('promo_code') ?? undefined, durationMinutes: identifier(params.get('duration_minutes')), participants: identifier(params.get('participants')), source: params.get('source') === 'assistant' ? 'assistant' : params.get('source') === 'express' ? 'express' : 'marketplace' }

  const showTeam = !!business && services.some(service => hasProfessionalChoice(service, business))
  // EFFECTS
  useEffect(() => { if (business) void trackMarketplaceEvent('business_view', { business_id: business.id, source: initialContext.source, dedupe_key: String(business.id) }) }, [business?.id])
  useEffect(() => { if (business && tab === 'services') services.forEach(service => { void trackMarketplaceEvent('service_view', { business_id: business.id, service_id: service.id, source: initialContext.source, dedupe_key: `${business.id}:${service.id}` }) }) }, [business?.id, tab])
  useEffect(() => { setSelectedBranch(null); setBooking(null); setTab('services') }, [id])
  useEffect(() => {
    if (business && params.get('book') === '1') {
      setBooking(initialContext)
      const next = new URLSearchParams(params)
      next.delete('book')
      setParams(next, { replace: true })
    }
  }, [business?.id, params.toString()])

  if (profile.loading) return <div role="status" aria-label={t('business.loading')} className="mx-auto max-w-6xl space-y-5"><Skeleton className="h-72 rounded-3xl" /><Skeleton className="h-20 rounded-2xl" /><div className="grid gap-4 sm:grid-cols-2">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-36 rounded-2xl" />)}</div></div>
  if (profile.error || !business) return <StateTA error title={t('business.unavailable')} description={profile.error ?? t('business.notFound')} onRetry={actions.reload} />
  const location = branch?.address ?? business.address
  const latitude = branch?.lat ?? business.lat
  const longitude = branch?.lng ?? business.lng
  const hasCoordinates = latitude != null && longitude != null && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
  const reserve = (context: BookingContext = {}) => setBooking({ ...initialContext, branchId: branch?.id, ...context })

  return <div className="page-enter mx-auto max-w-6xl space-y-7 pb-24 lg:pb-8">
    <ButtonTA  variant="ghost" className="-ml-3" render={<Link to="/cliente/explore" />} nativeButton={false}><ArrowLeft className="size-4" /> {t('business.explore')}</ButtonTA>
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
      {business.banner_url ? <div className="relative h-48 overflow-hidden bg-secondary sm:h-64"><img src={business.banner_url} alt={t('business.banner',{name:business.name})} className="size-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" /></div> : <div className="relative flex h-28 items-center overflow-hidden bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.2),transparent_65%)] px-6 sm:h-32 sm:px-7"><div className="absolute -right-10 -top-20 size-72 rounded-full border-[28px] border-primary/5" /><div className="absolute right-32 top-20 size-48 rounded-full border border-primary/10" /><span className="relative max-w-xs text-2xl font-light leading-tight tracking-tight text-primary/70 sm:text-3xl">{t('business.placeholder')}</span></div>}
      <div className="relative space-y-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5"><div className="min-w-0 flex-1"><div className="mb-3 flex flex-wrap items-center gap-3"><span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{business.category?.name ?? t('business.services')}</span></div><ProviderChecksTA kind="business" id={business.id} /><ActionHeaderTA title={business.name} description={business.description} actions={<FavoriteButtonTA type="business" id={business.id} />} /></div>{business.logo_url && <img src={business.logo_url} alt={t('business.logo',{name:business.name})} className="size-16 shrink-0 rounded-2xl border border-border bg-background object-cover sm:size-20" />}</div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm"><span className="inline-flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" />{location || t('business.branches')}</span>{(business.reviews_count ?? 0) > 0 && business.rating != null ? <button onClick={() => setTab('reviews')} className="inline-flex items-center gap-1.5"><Star className="size-4 fill-amber-400 text-amber-500" /><span className="font-semibold">{formatNumber(Number(business.rating),{maximumFractionDigits:1})}</span><span className="text-muted-foreground">({t('business.reviewCount',{count:business.reviews_count})})</span></button> : <span className="text-muted-foreground">{t('business.noReviews')}</span>}</div>
      </div>
    </section>
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-6"><nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label={t('business.info')}>{([{ id: 'services', label: t('business.services') }, { id: 'team', label: t('business.team') }, { id: 'reviews', label: t('business.reviews') }, { id: 'location', label: t('business.location') }] as const).filter(item => item.id !== 'team' || showTeam).map((item) => <button key={item.id} onClick={() => setTab(item.id)} aria-current={tab === item.id ? 'page' : undefined} className={cn('min-h-12 shrink-0 border-b-2 px-4 text-sm font-medium', tab === item.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>{item.label}</button>)}</nav>
        {tab === 'services' && <div className="space-y-7">
          {!!promotions.length && <section className="space-y-3"><h2 className="text-lg font-semibold tracking-tight">{t('business.special')}</h2>{promotions.map((promotion) => <div key={promotion.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5"><div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-sm font-semibold"><Tag className="size-4 text-primary" />{promotion.title}</p>{promotion.description && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{promotion.description}</p>}<p className="mt-2 text-xs text-muted-foreground">{t('business.promotionUntil',{date:formatDate(promotion.end_date.slice(0,10))})}</p></div><ButtonTA variant="outline" onClick={() => reserve({ serviceId: promotion.services?.[0]?.id, promoCode: promotion.promo_code })}>{t('business.viewPromotion')}</ButtonTA></div>)}</section>}
          <section><h2 className="mb-4 text-lg font-semibold tracking-tight">{t('business.experience')}</h2>{services.length > 1 && <ServiceCatalogFilterTA {...serviceCatalog} />}{!services.length ? <StateTA title={t('business.noServices')} description={t('business.catalogEmpty')} /> : !serviceCatalog.catalog.visible.length ? <div className="rounded-2xl border border-dashed border-border bg-card pb-5 text-center"><StateTA title={ui('noServiceMatches')} description={ui('tryAnotherService')} /><ButtonTA variant="outline" onClick={serviceCatalog.filters.clear}>{ui('clearSearch')}</ButtonTA></div> : <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{serviceCatalog.catalog.visible.map((service) => <article key={service.id} className="flex gap-4 p-5 transition-colors duration-200 hover:bg-secondary/30 sm:p-6">{service.image_url && <img src={service.image_url} alt="" loading="lazy" className="hidden size-20 shrink-0 rounded-xl object-cover sm:block" />}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{service.name}</h3><FavoriteButtonTA type="service" id={service.id} /></div>{service.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{service.description}</p>}<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{service.duration_minutes ?? service.duration} min</span>{hasProfessionalChoice(service, business) && service.professionals?.length ? <span>{t('business.professionalCount',{count:service.professionals.length})}</span> : null}</div><div className="mt-4 flex items-center justify-between gap-3"><p className="font-semibold">{bookingMoney(service.price, service.currency ?? business.currency)}</p><ButtonTA variant="outline" onClick={() => reserve({ serviceId: service.id })}>{t('business.choose')} <ArrowRight className="size-4" /></ButtonTA></div></div></article>)}</div>}</section>
        </div>}
        {tab === 'services' && <MediaGalleryTA items={services.flatMap(service => service.media_gallery ?? [])} />}
        {tab === 'team' && showTeam && <section><h2 className="mb-4 text-lg font-semibold tracking-tight">{t('business.people')}</h2>{!professionals.length ? <StateTA title={t('business.noTeam')} description={t('business.teamDescription')} /> : <div className="grid gap-4 sm:grid-cols-2">{professionals.map((professional) => <article className="rounded-2xl border border-border bg-card p-5" key={professional.id}><div className="flex items-center gap-3">{professional.photo_url ? <img src={professional.photo_url} alt="" loading="lazy" decoding="async" className="size-14 rounded-full object-cover" /> : <span className="grid size-14 place-items-center rounded-full bg-secondary"><UserRound className="size-6 text-muted-foreground" /></span>}<div><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{professional.name}</h3><FavoriteButtonTA type="professional" id={professional.id} /></div>{professional.specialty && <p className="mt-1 text-xs text-muted-foreground">{professional.specialty}</p>}</div></div><ProviderChecksTA kind="professional" id={professional.id} />{professional.bio && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{professional.bio}</p>}<ButtonTA variant="outline" className="mt-5 w-full" onClick={() => reserve({ professionalId: professional.id, serviceId: undefined })}>{t('business.bookProfessional',{name:professional.name.split(' ')[0]})}</ButtonTA></article>)}</div>}</section>}
        {tab === 'reviews' && <section><h2 className="mb-4 text-lg font-semibold tracking-tight">{t('business.experiences')}</h2>{!reviews.length ? <StateTA title={t('business.firstReview')} description={t('business.reviewsEmpty')} /> : <div className="divide-y divide-border">{reviews.map((review) => <article key={review.id} className="py-5"><div className="flex justify-between gap-3"><p className="text-sm font-semibold">{review.client?.name ?? review.client_name ?? t('business.client')}</p><span className="inline-flex items-center gap-1 text-sm"><Star className="size-3.5 fill-amber-400 text-amber-500" />{review.rating}</span></div>{review.is_verified && <p className="mt-2 text-xs text-primary">{t('reviews.verified')}</p>}{(review.service_rating || review.business_rating || review.professional_rating) && <dl className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">{(['service_rating','business_rating','professional_rating'] as const).map(key => review[key] != null && <div key={key}><dt className="inline">{t(`reviews.${key.replace('_rating','')}`)}: </dt><dd className="inline">{review[key]}/5</dd></div>)}</dl>}{review.comment && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>}<p className="mt-3 text-xs text-muted-foreground">{review.created_at && formatDate(review.created_at)}</p></article>)}</div>}</section>}
        {tab === 'location' && <section className="space-y-5"><h2 className="text-lg font-semibold tracking-tight">{t('business.meet')}</h2>{branches.length > 1 && <label className="block space-y-2 text-sm font-medium">{t('business.branch')}<select className="h-12 w-full rounded-xl border border-input bg-background px-3" value={branch?.id ?? ''} onChange={(event) => setSelectedBranch(Number(event.target.value))}>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<p className="text-sm text-muted-foreground">{location ?? t('business.noAddress')}</p>{hasCoordinates ? <div className="h-72 overflow-hidden rounded-2xl border border-border"><ShopsMap shops={[{ ...business, lat: latitude, lng: longitude }]} /></div> : <StateTA title={t('business.noMap')} description={t('business.noCoordinates')} />}{!!branch?.schedules?.length && <PanelTA title={t('business.schedule')}><dl className="divide-y divide-border px-5 pb-4">{[...branch.schedules].sort((a, b) => Number(a.day) - Number(b.day)).map((schedule) => <div className="flex justify-between gap-3 py-3 text-sm" key={schedule.day}><dt className="text-muted-foreground">{new Intl.DateTimeFormat(currentLocale(),{weekday:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,9,4+Number(schedule.day))))}</dt><dd>{schedule.is_closed ? t('business.closed') : `${formatTime(schedule.open_time)} – ${formatTime(schedule.close_time)}`}</dd></div>)}</dl></PanelTA>}{gallery.length > 1 && <div className="grid grid-cols-2 gap-3">{gallery.map((image) => <img key={image} src={image} alt={t('business.gallery',{name:business.name})} loading="lazy" className="aspect-square rounded-2xl object-cover" />)}</div>}</section>}
      </div>
      <aside className="hidden lg:block"><div className="sticky top-6 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-5" /></span><h2 className="text-xl font-semibold tracking-tight">{t('business.makeTime')}</h2><p className="text-sm leading-relaxed text-muted-foreground">{t('business.realTime')}</p><ButtonTA className="w-full" disabled={!services.length || !branches.length} onClick={() => reserve()}><CalendarDays className="size-4" /> {t('business.book')}</ButtonTA>{(branch?.phone || business.phone) && <ButtonTA  variant="outline" className="w-full" render={<a href={`tel:${branch?.phone || business.phone}`} />} nativeButton={false}><Phone className="size-4" /> {t('business.contact')}</ButtonTA>}<p className="text-xs leading-relaxed text-muted-foreground">{t('business.confirmFirst')}</p></div></aside>
    </div>
    <div className="fixed inset-x-0 bottom-[var(--bottom-nav-height,4rem)] z-20 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4"><p className="min-w-0 text-sm font-semibold">{t('business.next')}<span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{business.name}</span></p><ButtonTA disabled={!services.length || !branches.length} onClick={() => reserve()}>{t('business.book')} <ArrowRight className="size-4" /></ButtonTA></div></div>
    <BookingModal open={booking !== null} onClose={() => setBooking(null)} shop={business} services={services} professionals={professionals} resources={resources} initialContext={booking ?? undefined} />
  </div>
}
