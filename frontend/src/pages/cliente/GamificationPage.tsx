import { Link } from 'react-router-dom'
import { Award, Gift, Trophy, Zap } from 'lucide-react'
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA'
import { PanelTA } from '@/components/TA/PanelTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { DashboardSkeletonTA, StateTA } from '@/components/TA/StateTA'
import { useGamification } from '@/modules/gamification/useGamification'
import type { RankingPeriod } from '@/modules/gamification/types'

// CONSTANTS
const periods: { value: RankingPeriod; label: string }[] = [{ value: 'WEEK', label: 'Semana' }, { value: 'MONTH', label: 'Mes' }, { value: 'YEAR', label: 'Año' }]

// COMPONENT
export const GamificationPage = () => {
  const { data, state, filters, actions } = useGamification()
  const stats = data.stats
  const levelStart = stats ? Math.pow(stats.level - 1, 2) * 100 : 0
  const progress = stats ? Math.max(0, Math.min(100, (stats.total_xp - levelStart) / Math.max(1, stats.next_level_xp - levelStart) * 100)) : 0

  return <div className="space-y-7 pb-10">
    <ActionHeaderTA icon={Trophy} eyebrow="Tu actividad" title="Logros y recompensas" description="Consulta los puntos e insignias registrados en tu cuenta." />
    {state.loading ? <DashboardSkeletonTA /> : state.error ? <StateTA error title="No se cargaron los logros" description={state.error} onRetry={actions.retry} /> : stats && <>
      <section className="surface-primary grid gap-6 rounded-3xl p-6 text-white md:grid-cols-[minmax(0,1fr)_minmax(0,.7fr)] md:p-8">
        <div><p className="flex items-center gap-2 text-sm text-muted-foreground"><Zap className="size-4 text-accent" /> Tu experiencia</p><p className="mt-2 text-4xl font-semibold tabular-nums">{stats.total_xp.toLocaleString('es-CO')} <span className="text-lg text-muted-foreground">XP</span></p><div className="mt-5 flex justify-between text-sm"><span>Nivel {stats.level}</span><span>{stats.total_xp} / {stats.next_level_xp} XP</span></div><progress aria-label="Progreso al siguiente nivel" className="mt-2 h-2 w-full accent-accent" max={100} value={progress} /></div>
        <div className="flex flex-col justify-center gap-3 md:border-l md:border-border md:pl-8"><p className="text-sm text-muted-foreground">{stats.badges.length} insignias obtenidas</p><Link to="/cliente/loyalty" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"><Gift className="size-4" /> Consultar mis canjes</Link><p className="max-w-xs text-xs leading-relaxed text-muted-foreground">Los canjes dependen de los sellos y las reglas de cada negocio.</p></div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelTA icon={Award} tone="accent" title="Insignias" description="Tu progreso hacia cada logro.">
          {data.badges.length === 0 ? <StateTA title="Aún no hay insignias" description="Aquí aparecerán los logros disponibles cuando se publiquen." /> : <ul className="divide-y divide-border px-5 pb-5">{data.badges.map(badge => {
            const earned = stats.badges.some(item => item.badge_id === badge.id)
            return <li key={badge.id} className="flex items-start gap-3 py-4"><Award className={`mt-1 size-5 shrink-0 ${earned ? 'text-primary' : 'text-muted-foreground'}`} /><div className="min-w-0 flex-1"><p className="font-semibold">{badge.name}</p><p className="mt-1 text-sm text-muted-foreground">{badge.description}</p></div><span className="text-xs text-muted-foreground">{earned ? 'Obtenida' : `${badge.required_points} XP`}</span></li>
          })}</ul>}
        </PanelTA>
        <PanelTA icon={Trophy} title="Clasificación" description="Puntos registrados durante el período seleccionado.">
          <div className="mb-3 flex flex-wrap gap-1 px-5" aria-label="Período de clasificación">{periods.map(period => <ButtonTA key={period.value} variant={filters.period === period.value ? 'default' : 'ghost'} aria-pressed={filters.period === period.value} onClick={() => filters.setPeriod(period.value)}>{period.label}</ButtonTA>)}</div>
          {data.ranking.length === 0 ? <StateTA title="Sin actividad en este período" description="La clasificación se actualizará cuando se registren puntos." /> : <ol className="divide-y divide-border px-5 pb-5">{data.ranking.map((entry, index) => <li key={entry.user_id} className="flex items-center gap-3 py-3"><span className="w-7 text-sm tabular-nums text-muted-foreground">{entry.rank ?? index + 1}</span><Trophy className="size-4 text-primary" /><span className="min-w-0 flex-1 truncate text-sm">{entry.user?.name ?? 'Participante'}</span><span className="text-sm font-semibold tabular-nums">{Number(entry.total_points).toLocaleString('es-CO')} XP</span></li>)}</ol>}
        </PanelTA>
      </div>
      <PanelTA icon={Zap} title="Actividad reciente" description="Movimientos de experiencia de tu cuenta.">{stats.recent_xp.length === 0 ? <StateTA title="Tu historia empieza aquí" description="Todavía no tienes movimientos de experiencia registrados." /> : <ul className="divide-y divide-border px-5 pb-5">{stats.recent_xp.map(item => <li key={item.id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-medium">{item.description ?? item.action}</p><time className="text-xs text-muted-foreground" dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString('es-CO')}</time></div><span className="font-semibold tabular-nums">{item.points > 0 ? '+' : ''}{item.points} XP</span></li>)}</ul>}</PanelTA>
    </>}
  </div>
}
