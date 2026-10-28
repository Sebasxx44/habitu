import { useTranslation } from 'react-i18next'
import { Bell, CheckCheck, Loader2, RefreshCw } from 'lucide-react'
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { NotificationFiltersTA } from '@/modules/notifications/components/NotificationFiltersTA'
import { NotificationItemTA } from '@/modules/notifications/components/NotificationItemTA'
import { useNotificationFeed } from '@/modules/notifications/useNotificationFeed'
import { useNotificationInbox } from '@/modules/notifications/useNotificationInbox'
import { useNotificationNavigation } from '@/modules/notifications/useNotificationNavigation'

// COMPONENT
export const ClienteNotificationsPage = () => {
  // COMPOSABLES
  const { t } = useTranslation('notificationsUi')
  const { inbox, actions } = useNotificationInbox()
  const navigation = useNotificationNavigation()
  const feed = useNotificationFeed(inbox.items)

  // COMPUTED
  const busy = actions.pending !== null || navigation.state.pending !== null
  const error = inbox.error || actions.error || navigation.state.error

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <ActionHeaderTA eyebrow={t('eyebrow')} title={t('title')} description={t('description')}
        actions={<ButtonTA variant="outline" onClick={() => void actions.markAllRead()} disabled={busy || feed.view.unread === 0} className="gap-2 text-xs">{actions.pending === 'all' ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <CheckCheck className="size-4" />}{t('markAllRead')}</ButtonTA>} />
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_8px_32px_-20px_rgba(15,23,42,0.15)]" aria-label={t('inboxLabel')}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-6">
          <NotificationFiltersTA filter={feed.view.filter} unread={feed.view.unread} onChange={feed.actions.setFilter} />
          <ButtonTA type="button" variant="ghost" size="icon" className="rounded-full text-muted-foreground" onClick={inbox.refresh} disabled={inbox.loading || busy} aria-label={t('refresh')}>
            <RefreshCw className={`size-4 ${inbox.loading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
          </ButtonTA>
        </div>
        {error && <div role="status" className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm sm:mx-6"><p className="text-destructive">{error}</p>{inbox.error && <ButtonTA variant="ghost" size="sm" onClick={inbox.refresh}>{t('retry')}</ButtonTA>}</div>}
        {inbox.loading && inbox.items.length === 0 ? <div role="status" className="space-y-5 px-6 py-7" aria-label={t('loading')}>{[0, 1, 2].map(item => <div key={item} className="flex animate-pulse gap-4 motion-reduce:animate-none"><div className="size-11 rounded-xl bg-muted" /><div className="flex-1 space-y-3"><div className="h-3 w-2/3 rounded-full bg-muted" /><div className="h-3 w-full rounded-full bg-muted" /><div className="h-2.5 w-1/3 rounded-full bg-muted" /></div></div>)}</div> : feed.view.visible.length === 0 && !inbox.error ? (
          <div className="px-6 py-16 text-center" role="status">
            <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-[22px] bg-primary/5 text-primary">{feed.view.filter === 'unread' ? <CheckCheck className="size-7" aria-hidden="true" /> : <Bell className="size-7" aria-hidden="true" />}</span>
            <h2 className="text-lg font-semibold tracking-tight">{t('upToDate')}</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{t(feed.view.filter === 'unread' ? 'emptyUnread' : 'emptyInbox')}</p>
            {feed.view.filter === 'unread' && inbox.items.length > 0 && <ButtonTA variant="ghost" className="mt-5 text-xs text-primary" onClick={() => feed.actions.setFilter('all')}>{t('allNotifications')}</ButtonTA>}
          </div>
        ) : <ul className="divide-y divide-border/60">
          {feed.view.visible.map(item => <NotificationItemTA key={item.id} item={item} disabled={busy} pending={actions.pending === String(item.id) || navigation.state.pending === String(item.id)} hasDestination={Boolean(navigation.actions.destination(item))} onRead={() => void actions.markRead(item.id)} onOpen={() => void navigation.actions.open(item)} />)}
        </ul>}
      </section>
      {inbox.items.length > 0 && <p className="px-1 text-xs text-muted-foreground" aria-live="polite">{feed.view.unread === 0 ? t('noUnread') : t('unreadCount', { count: feed.view.unread })} · {t('inboxCount', { count: inbox.items.length })}</p>}
    </div>
  )
}
