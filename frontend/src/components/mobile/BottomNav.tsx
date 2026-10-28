import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/App'
import { primaryClientNavigation, visibleNavigation } from '@/components/TA/navigation'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { cn } from '@/lib/utils'

// COMPONENT
export const BottomNav = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { t } = useTranslation()
  const { user, permissions } = useAuth()
  const location = useLocation()
  if (!user) return null
  const items = user.role === 'CLIENTE' ? primaryClientNavigation(permissions) : visibleNavigation(user.role, permissions).slice(0, 3)
  return <nav aria-label={t('shared.mobileNav')} className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-primary/15 bg-background/95 shadow-[0_-6px_28px_hsl(var(--primary)/0.06)] px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"><div className="mx-auto flex max-w-lg items-center gap-1">{items.map(item => {
    const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    return <Link key={item.path} to={item.path} aria-current={active ? 'page' : undefined} className={cn('flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[9px] font-semibold transition-[background-color,color,box-shadow] duration-200 sm:text-[10px]', active ? 'bg-habitu-blue text-white shadow-md shadow-habitu-blue/20' : 'text-muted-foreground')}><item.icon className="size-[19px] transition-transform motion-safe:active:scale-90" aria-hidden="true" /><span className="max-w-full truncate">{item.label}</span></Link>
  })}<ButtonTA variant="ghost" onClick={onMenuClick} aria-label={t('shared.allModules')} className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[9px] font-semibold text-muted-foreground sm:text-[10px]"><Menu className="size-[19px]" />{t('shared.more')}</ButtonTA></div></nav>
}
