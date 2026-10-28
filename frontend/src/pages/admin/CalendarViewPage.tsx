import { Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, RefreshCw, Settings2 } from 'lucide-react'
import { useAuth } from '@/App'
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { StateTA } from '@/components/TA/StateTA'
import { CalendarView } from '@/components/premium/CalendarView'
import { useOperationalAgenda } from '@/composables/useOperationalAgenda'
import { CalendarBookingTA } from '@/modules/calendar/components/CalendarBookingTA'
import { CalendarReservationTA } from '@/modules/calendar/components/CalendarReservationTA'
import { CalendarSettingsTA } from '@/modules/calendar/components/CalendarSettingsTA'

// COMPONENTS
const CalendarOverviewTA = () => {
  const { list, options, filters, actions } = useOperationalAgenda(true)
  const { user, permissions } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [, setParams] = useSearchParams()
  const canCreate = user?.role === 'SUPERADMIN' || permissions.includes('appointments.create')
  return <div className="space-y-5 pb-8"><ActionHeaderTA eyebrow="Operación" title="Calendario" description="Toda tu agenda, en un solo lugar. Organiza el día y prepara cada visita." actions={<><ButtonTA variant="outline" onClick={() => navigate(`/admin/calendar/settings${location.search}`)}><Settings2 className="size-4" />Preferencias</ButtonTA>{canCreate && <ButtonTA onClick={() => navigate(`/admin/calendar/new${location.search}`)}><Plus className="size-4" />Nueva reserva</ButtonTA>}</>} />
    <div className="flex flex-wrap items-center justify-between gap-3">{options.branches.length > 0 && <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Sede<select value={filters.branch} onChange={event => { filters.setBranch(event.target.value); setParams(previous => { const next = new URLSearchParams(previous); if (event.target.value) next.set('branch_id', event.target.value); else next.delete('branch_id'); return next }, { replace: true }) }} className="h-10 max-w-64 rounded-xl border border-border bg-card px-3 text-sm text-foreground"><option value="">Todas las sedes</option>{options.branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}<div className="ml-auto flex items-center gap-3"><span role="status" aria-live="polite" className="text-xs text-muted-foreground">{list.loading ? 'Actualizando agenda…' : 'Agenda actualizada'}</span><ButtonTA variant="ghost" size="icon" disabled={list.loading} onClick={list.refresh} aria-label="Actualizar calendario"><RefreshCw className={`size-4 ${list.loading ? 'animate-spin' : ''}`} /></ButtonTA></div></div>
    {list.error ? <StateTA error title="Calendario no disponible" description={list.error} onRetry={list.refresh} /> : <div aria-busy={list.loading} className={list.loading ? 'opacity-60' : ''}><CalendarView appointments={list.loading ? [] : list.data} barbers={options.professionals} services={options.services} onDateChange={actions.setRange} /></div>}
  </div>
}

export const CalendarViewPage = () => <Routes><Route index element={<CalendarOverviewTA />} /><Route path="new" element={<CalendarBookingTA />} /><Route path="settings" element={<CalendarSettingsTA />} /><Route path=":id" element={<CalendarReservationTA />} /><Route path="*" element={<StateTA title="Vista no encontrada" description="Vuelve al calendario desde el menú para continuar." />} /></Routes>
