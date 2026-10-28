import { RealtimeStatusTA } from '@/modules/realtime/RealtimeStatusTA'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher'
import { FavoritesProvider } from '@/modules/favorites/FavoritesProvider'
import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut, Menu, Search, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/App'
import type { User } from '@/types/auth'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { InputTA } from '@/components/TA/InputTA'
import { guestNavigation, primaryClientNavigation, visibleNavigation } from '@/components/TA/navigation'
import { accountPath } from '@/modules/auth/services/returnPath'
import { guestHome } from '@/modules/auth/services/routeAccess'
import { BottomNav } from '@/components/mobile/BottomNav'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { FloatingAIChat } from '@/components/ai/FloatingAIChat'
import { NotificationBellTA } from '@/modules/notifications/components/NotificationBellTA'
import { HabituLogo } from '@/components/ui/HabituLogo'
import { cn } from '@/lib/utils'
import { useMobileLayout } from '@/composables/layout/useMobileLayout'
import { uniqueNavigationItems } from '@/composables/layout/navigationItems'

// TYPES
interface SidebarProps { collapsed: boolean; onCollapse: () => void; user: User | null; desktop?: boolean; onNavigate?: () => void }
interface TopbarProps { sidebarCollapsed: boolean; user: User | null }
interface LayoutProps { children: ReactNode; user: User | null }

// COMPONENTS
export const Sidebar = ({ collapsed, onCollapse, user, desktop = false, onNavigate }: SidebarProps) => {
  const { t } = useTranslation()
  const { permissions } = useAuth()
  const location = useLocation()
  const items = uniqueNavigationItems(user ? visibleNavigation(user.role, permissions) : guestNavigation())
  const groups = [{ id: 'workspace', label: !user || user.role === 'CLIENTE' ? t('shared.day') : t('shared.workspace') }, { id: 'growth', label: !user || user.role === 'CLIENTE' ? t('shared.forYou') : t('shared.growth') }, { id: 'settings', label: t('shared.account') }]
  return (
    <aside className={cn('flex h-full flex-col border-r border-border bg-card', desktop ? 'fixed inset-y-0 left-0 z-40 hidden lg:flex' : 'min-h-0 w-full', desktop && (collapsed ? 'w-[76px]' : 'w-[248px]'))}>
      <div className={cn('flex h-[76px] shrink-0 items-center border-b border-primary/10 bg-primary/[0.04] px-6', collapsed && 'justify-center px-3')}><HabituLogo variant={collapsed ? 'icon' : 'horizontal'} /></div>
      <nav aria-label={t('shared.mainNav')} className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 py-6">
        {groups.map(group => {
          const section = items.filter(item => item.group === group.id)
          if (!section.length) return null
          return <div key={group.id}>{!collapsed && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{group.label}</p>}<div className="space-y-1">{section.map(item => {
            const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            return <Link key={item.path} to={item.path} onClick={onNavigate} title={collapsed ? item.label : undefined} aria-label={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined} className={cn('group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none', active ? 'bg-habitu-blue text-white' : 'text-muted-foreground hover:bg-secondary hover:text-foreground', collapsed && 'justify-center px-0')}><item.icon className="size-5 shrink-0" aria-hidden="true" />{!collapsed && <span className="min-w-0 flex-1">{item.label}</span>}{active && !collapsed && <span className="size-1.5 shrink-0 rounded-full bg-habitu-lime" />}</Link>
          })}</div></div>
        })}
      </nav>
      <div className="shrink-0 border-t border-border p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {!user && <Link to={accountPath('/login', `?${new URLSearchParams({ returnTo: location.pathname + location.search })}`)} onClick={onNavigate} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"><UserIcon className="size-4" />{t('authUi:signIn')}</Link>}
        {user && <div className={cn('flex items-center gap-3 rounded-xl bg-secondary/70 p-2', collapsed && 'justify-center')}><Avatar className="size-9 rounded-xl">{user.avatar_url && <AvatarImage src={user.avatar_url} alt="" className="object-cover" />}<AvatarFallback className="rounded-xl bg-secondary text-xs font-semibold text-primary">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>{!collapsed && <div className="min-w-0"><p className="truncate text-xs font-semibold">{user.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{t(`roles.${user.role}`)}</p></div>}</div>}
        {desktop && <ButtonTA variant="ghost" className={cn('mt-2 w-full justify-start text-xs text-muted-foreground', collapsed && 'justify-center p-0')} onClick={onCollapse} aria-label={collapsed ? t('shared.expand') : t('shared.collapse')}>{collapsed ? <ChevronRight /> : <ChevronLeft />}{!collapsed && t('shared.collapseMenu')}</ButtonTA>}
      </div>
    </aside>
  )
}

export const Topbar = ({ sidebarCollapsed, user }: TopbarProps) => {
  const { t } = useTranslation()
  const { logout, permissions } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const isClient = !user || user.role === 'CLIENTE'
  const clientItems = user ? primaryClientNavigation(permissions) : guestNavigation()
  const accountSearch = `?${new URLSearchParams({ returnTo: location.pathname + location.search + location.hash })}`
  const profilePath = user ? '/account/profile' : '/login'
  const canOpenAccount = Boolean(user)
  return (
    <header className={cn('fixed left-0 right-0 top-0 z-30 flex h-[calc(56px+env(safe-area-inset-top))] items-center justify-between gap-1 border-b border-border bg-card pt-[env(safe-area-inset-top)] pl-[max(8px,env(safe-area-inset-left))] pr-[max(8px,env(safe-area-inset-right))] sm:gap-3 sm:px-7 lg:h-[calc(76px+env(safe-area-inset-top))] lg:px-9', !isClient && (sidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-[248px]'))}>
      <div className="flex min-w-0 flex-1 items-center gap-2 xl:gap-5">
        <SheetTrigger render={<ButtonTA variant="ghost" size="icon" className={cn('size-11 shrink-0', !isClient && 'lg:hidden')} aria-label={t('shared.openMenu')} />}><Menu className="size-5" aria-hidden="true" /></SheetTrigger>
        {isClient ? <>
          <Link to={user ? '/cliente/dashboard' : guestHome} aria-label={t('navigation.home')} className="inline-flex min-h-12 min-w-0 shrink-0 items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><HabituLogo variant="horizontal" decorative className="w-[88px] sm:w-[120px]" /></Link>
          <nav aria-label={t('shared.marketplaceNav')} className="ml-2 hidden shrink-0 items-center gap-1 lg:flex xl:gap-2">{clientItems.map(item => {
            const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            return <Link key={item.path} to={item.path} aria-current={active ? 'page' : undefined} className={cn('relative inline-flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary xl:px-3', active ? 'bg-habitu-blue text-white shadow-sm shadow-habitu-blue/20' : 'text-foreground/80 hover:bg-secondary')}><item.icon className="hidden size-4 xl:block" aria-hidden="true" />{item.label}</Link>
          })}</nav>
          <form className="relative ml-auto hidden w-full max-w-[240px] 2xl:block" role="search" onSubmit={event => { event.preventDefault(); navigate(`/cliente/explore${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`) }}><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-primary" aria-hidden="true" /><InputTA aria-label={t('shared.search')} placeholder={t('shared.searchPlaceholder')} value={query} onChange={event => setQuery(event.target.value)} className="bg-background pl-10 pr-4 text-xs" /></form>
        </> : <div className="min-w-0"><p className="truncate text-xs font-medium text-muted-foreground">{user ? t(`roles.${user.role}`) : 'habitu'}</p><p className="mt-1 hidden text-[10px] text-muted-foreground/80 sm:block">{t('shared.tagline')}</p></div>}
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div className="hidden items-center gap-1 sm:flex"><LanguageSwitcher /><ThemeToggle /></div>
        {user && <><div className="hidden sm:block"><RealtimeStatusTA /></div><NotificationBellTA isClient={isClient} /></>}
        {!user && <Link to={accountPath('/login', accountSearch)} className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-2 text-xs font-semibold text-primary sm:px-3">{t('authUi:signIn')}</Link>}
        <span className="mx-2 hidden h-6 w-px bg-border sm:block" />
        <DropdownMenu>
          <DropdownMenuTrigger render={<ButtonTA variant="ghost" size="icon" className="size-11" aria-label={t('shared.accountMenu')}><Avatar className="size-8 rounded-full">{user?.avatar_url && <AvatarImage src={user.avatar_url} alt="" className="object-cover" />}<AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{user ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="size-4" />}</AvatarFallback></Avatar></ButtonTA>} />
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5"><DropdownMenuGroup><DropdownMenuLabel className="p-3">{user?.name ?? t('authUi:guest')}</DropdownMenuLabel><DropdownMenuSeparator />{canOpenAccount && <DropdownMenuItem className="min-h-11 rounded-lg" onClick={() => navigate(profilePath)}><UserIcon />{t('shared.myAccount')}</DropdownMenuItem>}{user ? <DropdownMenuItem className="min-h-11 rounded-lg" onClick={logout}><LogOut />{t('auth.logout')}</DropdownMenuItem> : <><DropdownMenuItem className="min-h-11 rounded-lg" onClick={() => navigate(accountPath('/login', accountSearch))}>{t('authUi:signIn')}</DropdownMenuItem><DropdownMenuItem className="min-h-11 rounded-lg" onClick={() => navigate(accountPath('/register', accountSearch))}>{t('authUi:registerLink')}</DropdownMenuItem></>}</DropdownMenuGroup><div className="flex items-center justify-between border-t border-border px-2 pt-2 sm:hidden"><LanguageSwitcher /><ThemeToggle /></div></DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export const AppLayout = ({ children, user }: LayoutProps) => {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { viewport } = useMobileLayout(setMobileOpen)
  const isClient = !user || user.role === 'CLIENTE'
  return (
    <FavoritesProvider userId={user?.id ?? null}><Sheet open={mobileOpen} onOpenChange={setMobileOpen}><div className="app-canvas min-h-svh text-foreground">
      <a href="#main-content" className="fixed left-4 top-2 z-[100] -translate-y-20 rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground focus:translate-y-0">{t('shared.skip')}</a>
      {!isClient && <Sidebar desktop collapsed={collapsed} onCollapse={() => setCollapsed(value => !value)} user={user} />}
      <Topbar sidebarCollapsed={collapsed} user={user} />
      <SheetContent side="left" className="h-dvh max-h-dvh w-[min(340px,calc(100vw-24px))] gap-0 p-0 pt-[env(safe-area-inset-top)] motion-reduce:transition-none"><SheetTitle className="sr-only">{t('shared.mainNav')}</SheetTitle><SheetDescription className="sr-only">{t('shared.menuDescription')}</SheetDescription><Sidebar user={user} collapsed={false} onCollapse={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} /></SheetContent>
      <main id="main-content" tabIndex={-1} className={cn('min-h-svh pt-[calc(56px+env(safe-area-inset-top))] [overflow-anchor:none] focus:outline-none lg:pt-[calc(76px+env(safe-area-inset-top))]', !isClient && (collapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]'))}><div className={cn('app-page page-content mx-auto min-w-0 pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] pb-[calc(var(--bottom-nav-height,0px)+24px)] pt-4 sm:px-7 sm:pt-6 lg:px-9 lg:pb-24', isClient ? 'max-w-[1440px]' : 'max-w-[1560px]')}>{children}</div></main>
      {!viewport.keyboardOpen && <BottomNav />}
      {user?.role === 'CLIENTE' && !viewport.keyboardOpen && <FloatingAIChat />}
    </div></Sheet></FavoritesProvider>
  )
}
