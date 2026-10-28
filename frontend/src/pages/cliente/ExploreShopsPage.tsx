import { useTranslation } from 'react-i18next'
import { DiscoveryIntentsTA } from '@/modules/marketplace/components/DiscoveryIntentsTA'
import { momentFilters } from '@/modules/marketplace/timeWindows'
import { AnalyticsPreferencesTA } from '@/modules/analytics/components/AnalyticsPreferencesTA'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, List, Map as MapIcon, X } from 'lucide-react'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { StateTA } from '@/components/TA/StateTA'
import { SkeletonTA } from '@/components/TA/SkeletonTA'
import { LoadingTA } from '@/components/TA/LoadingTA'
import { BusinessCardTA } from '@/modules/discovery/components/BusinessCardTA'
import { DiscoveryFiltersTA } from '@/modules/discovery/components/DiscoveryFiltersTA'
import { DiscoveryHeroTA } from '@/modules/discovery/components/DiscoveryHeroTA'
import { DiscoveryCategoriesTA } from '@/modules/discovery/components/DiscoveryCategoriesTA'
import { useDiscoverySearch } from '@/modules/discovery/composables/useDiscoverySearch'
import { discoveryDay } from '@/modules/discovery/query'
import { useBusinessCategories } from '@/hooks/useBusinessCategories'
import { cn } from '@/lib/utils'

// COMPONENTS
const ShopsMap = lazy(() => import('@/components/ShopsMap').then((module) => ({ default: module.ShopsMap })))

// PAGE
export const ExploreShopsPage = () => {
  const { t } = useTranslation('marketplace')
  const { t: ui } = useTranslation('discoveryUi')
  // COMPOSABLES
  const { results, filters, search, location, favorites } = useDiscoverySearch()
  const { categories, error: categoryError } = useBusinessCategories()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  // STATE
  const [showFilters, setShowFilters] = useState(false)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  // LIFECYCLE
  const legacyCategory = params.get('category')
  useEffect(() => {
    if (legacyCategory && !filters.values.category_id) {
      const category = categories.find((entry) => entry.slug === legacyCategory)
      if (category) filters.change({ category_id: String(category.id) })
    }
  }, [legacyCategory, categories, filters.values.category_id, filters.change])
  // DERIVED STATE
  const selected = results.page.data.find((business) => business.id === selectedId)
  const chips = [
    { label: t('discovery.thisAfternoon'), active: filters.values.time_from === '12:00' && filters.values.date === discoveryDay(), values: momentFilters('afternoon') },
    { label: t('discovery.weekend'), active: filters.values.date === momentFilters('weekend').date && !!filters.values.date_to, values: momentFilters('weekend') },
    { label: ui('forYou'), active: filters.values.sort === 'recommended' && !filters.values.available && !filters.values.promotions, values: { sort: 'recommended', available: '', date: '', date_to: '', promotions: '' } },
    { label: ui('popular'), active: filters.values.sort === 'popular', values: { sort: 'popular', available: '', date: '', date_to: '', promotions: '' } },
    { label: ui('topRated'), active: filters.values.sort === 'rating', values: { sort: 'rating', available: '', date: '', date_to: '', promotions: '' } },
    { label: ui('today'), active: filters.values.available === '1' && filters.values.date === discoveryDay() && !filters.values.date_to, values: { sort: 'recommended', available: '1', date: discoveryDay(), date_to: '', promotions: '' } },
    { label: ui('thisWeek'), active: !!filters.values.date_to, values: { sort: 'recommended', available: '1', date: discoveryDay(), date_to: discoveryDay(6), promotions: '' } },
    { label: ui('promotions'), active: filters.values.promotions === '1', values: { sort: 'recommended', available: '', date: '', date_to: '', promotions: '1' } },
    { label: ui('newPlaces'), active: filters.values.sort === 'newest', values: { sort: 'newest', available: '', date: '', date_to: '', promotions: '' } },
  ]
  // RENDER
  return <div className="mx-auto max-w-[1600px] space-y-6 pb-10">
    <DiscoveryHeroTA search={search} filters={filters} location={location} onFilters={() => setShowFilters(true)} />
    <DiscoveryCategoriesTA categories={categories} filters={filters} />
    <DiscoveryIntentsTA onChoose={filters.change} />
    <div className="flex flex-wrap gap-3"><ButtonTA variant="outline" render={<Link to="/cliente/on-demand" />} nativeButton={false}>{t('discovery.express')}<ArrowUpRight className="size-4" /></ButtonTA><ButtonTA variant="ghost" render={<Link to="/cliente/ai-chat?intent=repeat" />} nativeButton={false}>{t('concierge.repeat')}<ArrowRight className="size-4" /></ButtonTA></div>
    {(location.error || favorites.error || categoryError) && <p role="status" className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">{location.error || favorites.error || categoryError}</p>}

    <div className="surface-card flex flex-col justify-between gap-4 rounded-2xl border border-primary/10 p-3 sm:flex-row sm:items-center"><div className="flex gap-2 overflow-x-auto pb-1" aria-label={ui('collections')}>{chips.map((chip) => <button key={chip.label} onClick={() => filters.change(chip.values)} aria-pressed={chip.active} className={cn('min-h-10 shrink-0 rounded-xl px-3 text-xs font-medium transition-colors', chip.active ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-primary/5 text-muted-foreground hover:bg-primary/10 hover:text-primary')}>{chip.label}</button>)}</div><div className="flex shrink-0 gap-1 self-start rounded-xl border border-border bg-card p-1" aria-label={ui('resultView')}>{(['list', 'map'] as const).map((value) => <ButtonTA key={value} onClick={() => setView(value)} aria-pressed={view === value} variant={view === value ? 'default' : 'ghost'} className="min-h-9 px-3 text-xs">{value === 'list' ? <List className="size-3.5" /> : <MapIcon className="size-3.5" />}{ui(value === 'list' ? 'list' : 'map')}</ButtonTA>)}</div></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><p role="status" aria-live="polite" className="text-sm font-medium">{results.loading ? ui('searching') : ui('results', { count: results.page.total })}{filters.values.zone && ui('inZone', { zone: filters.values.zone })}</p>{filters.count > 0 && <ButtonTA variant="ghost" onClick={filters.clear} className="min-h-8 px-2 text-xs text-muted-foreground"><X className="size-3" />{ui('clearFilters')}</ButtonTA>}</div><label className="flex items-center gap-2 text-xs text-muted-foreground">{ui('sort')}<select aria-label={ui('sortResults')} value={filters.values.sort} onChange={(event) => filters.change({ sort: event.target.value })} className="min-h-10 rounded-xl border border-border bg-card px-3 text-xs text-foreground"><option value="recommended">{ui('recommended')}</option><option value="rating">{ui('topRated')}</option><option value="popular">{ui('mostPopular')}</option><option value="price">{ui('lowestPrice')}</option><option value="newest">{ui('latest')}</option>{location.point && <option value="distance">{ui('nearest')}</option>}</select></label></div>
    {results.error ? <StateTA error title={ui('searchFailed')} description={results.error} onRetry={results.reload} /> : !results.loading && results.page.total === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card py-6"><StateTA title={ui('emptyTitle')} description={location.point ? ui('emptyNearby', { radius: filters.values.radius }) : ui('emptyDescription')} /><div className="flex flex-wrap justify-center gap-3 pb-5">{location.point && <ButtonTA variant="outline" onClick={location.clear}>{ui('removeDistance')}</ButtonTA>}<ButtonTA onClick={filters.clear}>{ui('allPlaces')}</ButtonTA></div></div> : <div className={cn('grid items-start gap-6', view === 'map' && 'lg:grid-cols-[minmax(0,1fr)_minmax(320px,.78fr)]')}>
      <section aria-label={ui('placesFound')} aria-busy={results.loading} className={cn('min-w-0', view === 'map' && 'hidden lg:block')}>
        {results.loading ? <SkeletonTA variant="card" count={6} label={ui('loadingPlaces')} /> : <div className="discovery-results-grid">{results.page.data.map((business) => <BusinessCardTA key={business.id} business={business} selected={selectedId === business.id} onSelect={() => setSelectedId(business.id)} favorite={favorites.ids.includes(business.id)} busy={favorites.busy !== null} onFavorite={() => void favorites.toggle(business.id)} />)}</div>}
      </section>
      {view === 'map' && <aside className="sticky top-5 min-w-0"><div className="h-[62dvh] min-h-[380px] max-h-[740px]"><Suspense fallback={<LoadingTA label={ui('loadingMap')} className="h-full rounded-2xl bg-primary/5" />}><ShopsMap shops={results.page.data} selectedShopId={selectedId} userLocation={location.point} radius={location.point ? Number(filters.values.radius) : undefined} onSelectShop={(shop) => setSelectedId(shop.id)} onOpenShop={(shop) => navigate(`/cliente/business/${shop.id}`)} /></Suspense></div>{selected && <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{selected.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{selected.main_branch?.address || selected.address}</p></div><ButtonTA render={<Link to={`/cliente/business/${selected.id}`} />} nativeButton={false} variant="outline" className="text-xs">{ui('viewPlace')}<ArrowRight className="size-3.5" /></ButtonTA></div>}<p className="mt-2 px-1 text-[10px] text-muted-foreground">{ui('mapDescription')}</p></aside>}
    </div>}
    {!results.loading && !results.error && results.page.last_page > 1 && <nav aria-label={ui('pagination')} className="flex items-center justify-center gap-4 pt-4"><ButtonTA variant="outline" disabled={results.page.current_page <= 1} onClick={() => filters.change({ page: String(results.page.current_page - 1) })}>{ui('previous')}</ButtonTA><span className="text-xs text-muted-foreground">{ui('pageOf', { page: results.page.current_page, total: results.page.last_page })}</span><ButtonTA variant="outline" disabled={results.page.current_page >= results.page.last_page} onClick={() => filters.change({ page: String(results.page.current_page + 1) })}>{ui('next')}</ButtonTA></nav>}
    <AnalyticsPreferencesTA />
    <DiscoveryFiltersTA open={showFilters} onClose={() => setShowFilters(false)} filters={filters} categories={categories} hasLocation={!!location.point} />
  </div>
}
