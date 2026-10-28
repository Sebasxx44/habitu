import { Heart, ArrowRight, Building2, Sparkles, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { StateTA } from '@/components/TA/StateTA'
import { SkeletonTA } from '@/components/TA/SkeletonTA'
import { useFavoritesPage } from '@/modules/favorites/useFavoritesPage'
import type { FavoriteType } from '@/modules/favorites/types'

// CONFIGURATION
const icons = { business: Building2, service: Sparkles, professional: UserRound }
const filters: (FavoriteType | '')[] = ['', 'business', 'service', 'professional']

// VIEW
export const ClienteFavoritesPage = () => {
  const { t } = useTranslation()
  const { results, filters: selection, actions } = useFavoritesPage()
  return <div className="page-enter space-y-7">
    <ActionHeaderTA icon={Heart} title={t('favorites.title')} description={t('favorites.description')} actions={<ButtonTA variant="outline" render={<Link to="/cliente/explore" />} nativeButton={false}>{t('navigation.explore')}<ArrowRight /></ButtonTA>} />
    <div role="group" aria-label={t('common.filter')} className="flex flex-wrap gap-2">{filters.map(type => <ButtonTA key={type} variant={selection.type === type ? 'default' : 'outline'} aria-pressed={selection.type === type} onClick={() => selection.filter(type)}>{t(`favorites.${type || 'all'}`)}</ButtonTA>)}</div>
    {results.error && <StateTA error title={t('common.error')} description={results.error} onRetry={actions.retry} />}
    {results.loading ? <SkeletonTA variant="card" count={3} label={t('common.loading')} /> : !results.error && !results.data?.data.length ? <StateTA title={t('favorites.empty')} description={t('favorites.emptyDescription')} /> : <>
      <p className="text-sm text-muted-foreground">{t('favorites.count', { count: results.data?.total ?? 0 })}</p>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.data?.data.map(item => {
        const Icon = icons[item.type]
        return <article key={`${item.type}:${item.id}`} className="surface-card flex flex-col overflow-hidden rounded-2xl border border-primary/10 bg-card">
          {item.image_url ? <img src={item.image_url} alt="" loading="lazy" decoding="async" className="h-44 w-full object-cover" /> : <div className="surface-primary grid h-36 place-items-center"><Icon className="size-12 text-accent" /></div>}
          <div className="flex flex-1 flex-col p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">{t(`favorites.${item.type}`)}</p><h2 className="mt-1 font-semibold">{item.name ?? t('favorites.unavailable')}</h2></div><ButtonTA size="icon" variant="ghost" disabled={results.pending !== null} aria-label={t('favorites.remove')} onClick={() => { void actions.remove(item.type,item.id) }}><Heart className="fill-primary text-primary" /></ButtonTA></div>
          {item.type !== 'business' && <p className="mt-2 text-sm text-muted-foreground">{item.business_name}</p>}{item.address && <p className="mt-2 text-xs text-muted-foreground">{item.address}</p>}
          {item.available && item.url ? <ButtonTA className="mt-5 w-full" variant="outline" render={<Link to={item.url} />} nativeButton={false}>{t('favorites.view')}<ArrowRight /></ButtonTA> : <p className="mt-4 text-sm text-muted-foreground">{t('favorites.unavailableDescription')}</p>}</div>
        </article>
      })}</div>
      {(results.data?.last_page ?? 1) > 1 && <nav aria-label={t('favorites.title')} className="flex items-center justify-between gap-3"><ButtonTA variant="outline" disabled={selection.page <= 1} onClick={() => selection.setPage(selection.page - 1)}>{t('shared.previous')}</ButtonTA><p className="text-xs text-muted-foreground">{t('favorites.page',{page:selection.page,total:results.data?.last_page})}</p><ButtonTA variant="outline" disabled={selection.page >= (results.data?.last_page ?? 1)} onClick={() => selection.setPage(selection.page + 1)}>{t('shared.next')}</ButtonTA></nav>}
    </>}
  </div>
}
