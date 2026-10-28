import { Building2, CalendarCheck, Coins, Plus, RefreshCw, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { InputTA } from '@/components/TA/InputTA'
import { StateTA } from '@/components/TA/StateTA'
import { ConfirmDialogTA } from '@/components/TA/ConfirmDialogTA'
import { BranchEditorTA } from '@/modules/branches/components/BranchEditorTA'
import { BranchCardTA } from '@/modules/branches/components/BranchCardTA'
import { BranchChartsTA } from '@/modules/branches/components/BranchChartsTA'
import { useBranchDirectory } from '@/modules/branches/composables/useBranchDirectory'
import { useBranchEditor } from '@/modules/branches/composables/useBranchEditor'
import { DateRangeFilterTA } from '@/components/TA/DateRangeFilterTA'

// COMPONENT
export const AdminBranchesPage = () => {
  const { user } = useAuth()
  const { directory, filters } = useBranchDirectory(user?.barber_shop_id)
  const { editor, removal } = useBranchEditor(user?.barber_shop_id, directory.refresh)
  const summary = directory.summary
  const selectClass = 'mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm'
  return <div className="space-y-6 pb-10">
    <ActionHeaderTA eyebrow="Tu negocio, sede por sede" title="Sucursales" description="Organiza la operación, compara resultados y facilita que tus clientes lleguen a la sede correcta." actions={<><ButtonTA variant="outline" disabled={directory.loading} onClick={directory.refresh} aria-label="Actualizar sucursales"><RefreshCw className="size-4" /></ButtonTA><ButtonTA onClick={editor.create} disabled={!user?.barber_shop_id}><Plus className="size-4" />Nueva sucursal</ButtonTA></>} />
    <section aria-label="Filtros de sucursales" className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
      <label className="text-xs text-muted-foreground">Buscar sucursal<div className="relative mt-2"><Search className="absolute left-3 top-3.5 size-4" /><InputTA value={filters.search} onChange={event => filters.setSearch(event.target.value)} maxLength={100} placeholder="Nombre o dirección…" className="pl-10" /></div></label>
      <label className="text-xs text-muted-foreground">Estado<select className={selectClass} value={filters.active} onChange={event => filters.setActive(event.target.value)}><option value="">Todas las sedes</option><option value="1">Activas</option><option value="0">Inactivas</option></select></label>

      <label className="text-xs text-muted-foreground">Moneda<select className={selectClass} value={filters.currency} onChange={event => filters.setCurrency(event.target.value)}>{['COP', 'USD', 'EUR', 'MXN', 'PEN', 'CLP', 'ARS', 'BRL'].map(currency => <option key={currency}>{currency}</option>)}</select></label>
    </section>
    <DateRangeFilterTA value={filters.range} onChange={filters.setRange} />
    {directory.loading ? <StateTA title="Cargando operación de tus sedes" description="Consultando sucursales y resultados del período." /> : directory.error ? <StateTA error title="No pudimos cargar las sucursales" description={directory.error} onRetry={directory.refresh} /> : <>
      {summary && <section aria-label="Resumen de sedes filtradas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        { label: 'Sedes activas', value: `${summary.active} / ${summary.branches}`, detail: 'De las sedes que coinciden con los filtros', icon: Building2 },
        { label: 'Reservas del período', value: String(summary.appointments), detail: 'Todos los estados de reserva', icon: CalendarCheck },
        { label: `Valor realizado · ${summary.currency}`, value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: summary.currency, maximumFractionDigits: 0 }).format(summary.revenue), detail: 'Servicios completados, sin descontar costos', icon: Coins },
        { label: 'Próximas citas', value: String(summary.upcoming), detail: 'Pendientes y confirmadas desde ahora', icon: CalendarCheck },
      ].map(metric => <div key={metric.label} className="rounded-2xl border border-border bg-card p-5"><div className="flex justify-between gap-2 text-xs text-muted-foreground"><span>{metric.label}</span><metric.icon className="size-4 text-primary" /></div><p className="mt-3 text-2xl font-bold tracking-tight tabular-nums">{metric.value}</p><p className="mt-2 text-[11px] text-muted-foreground">{metric.detail}</p></div>)}</section>}
      {directory.items.length > 0 ? <><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Tus sedes <span className="text-sm font-normal text-muted-foreground">({directory.total})</span></h2><p className="text-xs text-muted-foreground">{summary?.start} — {summary?.end} · Horarios locales del negocio</p></div><div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">{directory.items.map(branch => <BranchCardTA key={branch.id} branch={branch} currency={filters.currency} onEdit={editor.edit} onRemove={removal.select} />)}</div><BranchChartsTA branches={directory.analytics} currency={filters.currency} /></> : <StateTA title={filters.search || filters.active ? 'No hay sedes con estos filtros' : 'Tu próxima sede empieza aquí'} description={filters.search || filters.active ? 'Prueba otro nombre o cambia el estado seleccionado.' : 'Crea una sucursal con su dirección, contacto y horario para organizar las reservas.'} />}
      {directory.lastPage > 1 && <nav aria-label="Paginación de sucursales" className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Página {filters.page} de {directory.lastPage}</p><div className="flex gap-2"><ButtonTA variant="outline" disabled={filters.page === 1} onClick={() => filters.setPage(filters.page - 1)}>Anterior</ButtonTA><ButtonTA variant="outline" disabled={filters.page === directory.lastPage} onClick={() => filters.setPage(filters.page + 1)}>Siguiente</ButtonTA></div></nav>}
    </>}
    <BranchEditorTA editor={editor} />
    <ConfirmDialogTA open={!!removal.branch} title="Eliminar sucursal" description={`Se eliminará ${removal.branch?.name ?? 'esta sucursal'}. Si tiene historial de citas, desactívala desde Editar para conservarlo.`} confirmLabel="Eliminar sucursal" busy={removal.busy} error={removal.error} onClose={() => removal.select(null)} onConfirm={() => { void removal.confirm() }} />
  </div>
}
