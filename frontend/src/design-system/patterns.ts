export const cardPatterns = {
  base: 'surface-card',
  interactive: 'hover:shadow-[0_18px_50px_rgba(59,77,255,0.12)] hover:border-habitu-primary/30 transition-all duration-300 cursor-pointer active:scale-[0.99] motion-reduce:transform-none',
  elevated: 'surface-primary rounded-[1.25rem] border text-white',
  compact: 'rounded-2xl border border-habitu-border bg-card shadow-sm',
  flat: 'rounded-2xl border border-habitu-border bg-card',
} as const;

export const buttonPatterns = {
  primary: 'h-11 px-6 rounded-2xl font-semibold bg-primary text-primary-foreground hover:bg-habitu-dark shadow-sm shadow-habitu-primary/10 active:scale-[0.97] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-habitu-primary/40',
  secondary: 'h-11 px-6 rounded-2xl font-semibold bg-habitu-cream text-habitu-primary border border-habitu-border hover:bg-secondary/80 active:scale-[0.97] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-habitu-primary/30',
  ghost: 'h-11 px-4 rounded-2xl font-medium text-habitu-muted hover:text-habitu-ink hover:bg-habitu-surface/50 active:scale-[0.97] transition-all duration-200',
  danger: 'h-11 px-6 rounded-2xl font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.97] transition-all duration-300',
  outline: 'h-11 px-6 rounded-2xl font-semibold border border-habitu-border bg-card hover:bg-habitu-surface/30 active:scale-[0.97] transition-all duration-200',
  icon: 'h-10 w-10 rounded-2xl flex items-center justify-center text-habitu-muted hover:text-habitu-ink hover:bg-habitu-surface/30 active:scale-90 transition-all',
  gold: 'h-12 px-8 rounded-2xl font-bold bg-accent text-accent-foreground hover:bg-habitu-gold/90 shadow-md shadow-habitu-gold/20 active:scale-[0.97] transition-all duration-300',
} as const;

export const layoutPatterns = {
  page: 'min-h-screen bg-background',
  container: 'max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8',
  containerNarrow: 'max-w-3xl mx-auto px-4 sm:px-6',
  section: 'py-6 space-y-6',
  sectionLg: 'py-10 space-y-8',
  grid2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
  grid3: 'grid grid-cols-1 md:grid-cols-3 gap-6',
  grid4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6',
  gridAuto: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
} as const;

export const textPatterns = {
  pageTitle: 'text-3xl md:text-4xl font-bold tracking-tight text-habitu-ink',
  pageTitleLg: 'text-4xl md:text-5xl font-bold tracking-tighter text-habitu-ink',
  sectionTitle: 'text-lg font-bold text-habitu-ink',
  sectionTitleSm: 'text-sm font-bold uppercase tracking-wider text-habitu-muted',
  cardTitle: 'text-base font-bold text-habitu-ink',
  label: 'text-xs font-semibold uppercase tracking-wider text-habitu-muted',
  labelSm: 'text-[10px] font-bold uppercase tracking-widest text-habitu-muted',
  value: 'text-base font-bold text-habitu-ink',
  valueLg: 'text-2xl font-bold text-habitu-ink',
  valueXl: 'text-4xl font-bold tracking-tight text-habitu-ink',
  muted: 'text-sm text-habitu-muted',
  mutedXs: 'text-xs text-habitu-muted',
  badge: 'text-[11px] font-semibold tracking-wide',
} as const;

export const inputPatterns = {
  base: 'h-12 rounded-2xl bg-card border-habitu-border shadow-sm focus-visible:ring-2 focus-visible:ring-habitu-primary/30 text-habitu-ink placeholder:text-habitu-muted',
  lg: 'h-14 rounded-2xl bg-card border-habitu-border shadow-sm text-base font-medium focus-visible:ring-2 focus-visible:ring-habitu-primary/30 text-habitu-ink',
  textarea: 'rounded-2xl bg-card border-habitu-border shadow-sm min-h-[100px] focus-visible:ring-2 focus-visible:ring-habitu-primary/30 text-habitu-ink',
} as const;

export const modalPatterns = {
  base: 'bg-card border-habitu-border rounded-[1.25rem] shadow-[0_24px_60px_rgba(0,0,0,0.15)] p-0 overflow-hidden',
  wide: 'w-[92vw] !max-w-6xl bg-card border-habitu-border rounded-[1.25rem] shadow-[0_24px_60px_rgba(0,0,0,0.15)] p-0 overflow-hidden',
  narrow: 'max-w-2xl bg-card border-habitu-border rounded-[1.25rem] shadow-[0_24px_60px_rgba(0,0,0,0.15)] p-0 overflow-hidden',
} as const;

export const statusColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
  PENDING: { bg: 'bg-amber-400/10', text: 'text-amber-800 dark:text-amber-200', border: 'border-amber-400/30', label: 'Pendiente' },
  CONFIRMED: { bg: 'bg-habitu-primary/10', text: 'text-habitu-primary', border: 'border-habitu-primary/20', label: 'Confirmada' },
  ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20', label: 'Activo' },
  COMPLETED: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20', label: 'Completada' },
  CANCELLED: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/20', label: 'Cancelada' },
  NO_SHOW: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/20', label: 'No asistió' },
  RESCHEDULED: { bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/20', label: 'Reagendada' },
  INACTIVE: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20', label: 'Inactivo' },
};
