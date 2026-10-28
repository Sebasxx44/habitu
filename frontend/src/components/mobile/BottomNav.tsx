import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/App'
import { guestNavigation, primaryClientNavigation, visibleNavigation } from '@/components/TA/navigation'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { cn } from '@/lib/utils'
import { SheetTrigger } from '@/components/ui/sheet'
import { bottomNavigationItems } from '@/composables/layout/navigationItems'
import { useBottomNavHeight } from '@/composables/layout/useBottomNavHeight'

// COMPONENT
export const BottomNav = () => {
  const { t } = useTranslation()
  const { user, permissions } = useAuth()
  const location = useLocation()
  const ref = useBottomNavHeight()
  const items = bottomNavigationItems(!user ? guestNavigation() : user.role === 'CLIENTE' ? primaryClientNavigation(permissions) : visibleNavigation(user.role, permissions), !user || user.role === 'CLIENTE' ? 4 : 3)
  return <nav ref={ref} aria-label={t('shared.mobileNav')} className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-border bg-card pb-[max(8px,env(safe-area-inset-bottom))] pl-[max(4px,env(safe-area-inset-left))] pr-[max(4px,env(safe-area-inset-right))] pt-1 shadow-[0_-2px_12px_hsl(var(--foreground)/0.04)] lg:hidden"><div className="mx-auto grid max-w-lg auto-cols-fr grid-flow-col gap-0.5">{items.map(item => {
    const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    return <Link key={item.path} to={item.path} aria-current={active ? 'page' : undefined} className={cn('flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold leading-[1.15] transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none min-[360px]:text-xs', active ? 'bg-habitu-blue text-white' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}><item.icon className="size-5 shrink-0" aria-hidden="true" /><span className="w-full whitespace-normal break-words text-center">{item.label}</span></Link>
  })}<SheetTrigger render={<ButtonTA variant="ghost" aria-label={t('shared.allModules')} className="flex h-auto min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold leading-[1.15] text-muted-foreground transition-colors duration-100 active:scale-100 motion-reduce:transition-none min-[360px]:text-xs" />}><Menu className="size-5 shrink-0" aria-hidden="true" /><span className="whitespace-normal text-center">{t('shared.more')}</span></SheetTrigger></div></nav>
}
