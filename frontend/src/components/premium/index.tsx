import type { ChangeEventHandler, MouseEvent, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LoadingTA } from '@/components/TA/LoadingTA'
import { PanelTA } from '@/components/TA/PanelTA'

export const MetricCard = ({ title, value, subtitle, icon: Icon, trend, trendUp, color = 'emerald' }: { title: string; value: ReactNode; subtitle?: string; icon?: LucideIcon; trend?: ReactNode; trendUp?: boolean; color?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'violet' }) => {
  const colors = {
    emerald: { bg: 'bg-primary/10', icon: 'text-primary', value: 'text-foreground' },
    cyan: { bg: 'bg-cyan-600/10', icon: 'text-cyan-800 dark:text-cyan-200', value: 'text-foreground' },
    amber: { bg: 'bg-amber-500/10', icon: 'text-amber-800 dark:text-amber-200', value: 'text-foreground' },
    rose: { bg: 'bg-rose-600/10', icon: 'text-rose-700 dark:text-rose-200', value: 'text-foreground' },
    violet: { bg: 'bg-violet-600/10', icon: 'text-violet-700 dark:text-violet-200', value: 'text-foreground' },
  }
  const c = colors[color] || colors.emerald

  return (
    <div className="stat-card group relative overflow-hidden rounded-2xl bg-card text-card-foreground border border-primary/15 p-5">
      <div aria-hidden="true" className={cn('absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl', c.bg)} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && <div className={cn('p-2 rounded-xl', c.bg)}><Icon className={cn('w-4 h-4', c.icon)} /></div>}
        </div>
        <p className={cn('text-2xl font-bold mb-1', c.value)}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {trend !== undefined && (
          <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trendUp ? 'text-amber-800 dark:text-amber-200' : 'text-rose-700 dark:text-rose-200')}>
            <span>{trendUp ? '↑' : '↓'}</span>
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export const StatusBadge = ({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) => {
  const config: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
    ACTIVA: { bg: 'bg-amber-400/10', text: 'text-amber-800 dark:text-amber-200', border: 'border-amber-400/20', dot: 'bg-amber-400', label: 'Activa' },
    VENCIDA: { bg: 'bg-rose-400/10', text: 'text-rose-700 dark:text-rose-200', border: 'border-rose-400/20', dot: 'bg-rose-400', label: 'Vencida' },
    PENDIENTE: { bg: 'bg-amber-400/10', text: 'text-amber-800 dark:text-amber-200', border: 'border-amber-400/20', dot: 'bg-amber-400', label: 'Pendiente' },
    CONFIRMADA: { bg: 'bg-cyan-400/10', text: 'text-cyan-800 dark:text-cyan-200', border: 'border-cyan-400/20', dot: 'bg-cyan-400', label: 'Confirmada' },
    COMPLETADA: { bg: 'bg-amber-400/10', text: 'text-amber-800 dark:text-amber-200', border: 'border-amber-400/20', dot: 'bg-amber-400', label: 'Completada' },
    CANCELADA: { bg: 'bg-rose-400/10', text: 'text-rose-700 dark:text-rose-200', border: 'border-rose-400/20', dot: 'bg-rose-400', label: 'Cancelada' },
    Sistema: { bg: 'bg-blue-400/10', text: 'text-primary', border: 'border-blue-400/20', dot: 'bg-blue-400', label: 'Sistema' },
    Custom: { bg: 'bg-slate-400/10', text: 'text-muted-foreground', border: 'border-slate-400/20', dot: 'bg-slate-400', label: 'Custom' },
  }
  const c = config[status] || config.ACTIVA
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full font-medium border', sizeClass, c.bg, c.text, c.border)}>
      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', c.dot)} />
      {c.label}
    </span>
  )
}

export const DashboardCard = ({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) => (
  <PanelTA title={title} description={subtitle} action={action} className={className}>
    <div className="p-5 pt-0">{children}</div>
  </PanelTA>
)

export const EmptyState = ({ icon: Icon, title, description }: { icon?: LucideIcon; title: string; description?: string }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4">
        {Icon && <Icon className="w-8 h-8 text-primary" />}
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  )
}

export const LoadingState = ({ text = 'Cargando…' }: { text?: string }) => <LoadingTA label={text} />

export const SectionHeader = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export const SearchInput = ({ value, onChange, placeholder = 'Buscar...', className }: { value: string; onChange: ChangeEventHandler<HTMLInputElement>; placeholder?: string; className?: string }) => {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" strokeWidth="2"/>
          <path strokeWidth="2" d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          'w-full h-9 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border text-sm',
          'placeholder:text-muted-foreground transition-all duration-200',
          'focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
          className
        )}
      />
    </div>
  )
}

export const ActionMenu = ({ items }: { items: { label: string; icon?: LucideIcon; danger?: boolean; onClick?: (event: MouseEvent<HTMLButtonElement>) => void }[] }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button 
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }} 
        className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl bg-popover border border-border shadow-xl py-1 animate-fade-in">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={(e) => { item.onClick?.(e); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                  item.danger ? 'text-rose-700 dark:text-rose-200 hover:bg-rose-400/10' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {item.icon && <item.icon className="w-3.5 h-3.5" />}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
export * from '@/components/premium/Skeletons'
export * from '@/components/premium/BarberDetailsView'
export * from '@/components/premium/CalendarView'
export * from '@/components/premium/CustomTabs'
export * from '@/components/premium/PremiumModal'
export * from '@/components/premium/AppointmentDetailView'
export * from '@/components/premium/PremiumSelect'
