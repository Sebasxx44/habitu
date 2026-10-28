import { OnDemandReassignmentTA } from "@/modules/home-service/components/OnDemandReassignmentTA";
import { AlertTriangle, ArrowRight, RefreshCw, Search } from 'lucide-react';
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA';
import { ButtonTA } from '@/components/TA/ButtonTA';
import { InputTA } from '@/components/TA/InputTA';
import { PanelTA } from '@/components/TA/PanelTA';
import { StateTA } from '@/components/TA/StateTA';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HomeServiceProgressTA } from '@/modules/home-service/components/HomeServiceProgressTA';
import { OnDemandAnalyticsTA } from '@/modules/home-service/components/OnDemandAnalyticsTA';
import { useOnDemandOperations } from '@/modules/home-service/composables/useOnDemandOperations';
import { DateRangeFilterTA } from '@/components/TA/DateRangeFilterTA';
import { useOnDemandAnalytics } from '@/modules/home-service/composables/useOnDemandAnalytics';
import { HOME_SERVICE_STATUS, formatHomeServiceDate, formatHomeServicePrice } from '@/modules/home-service/helpers';
import type { OnDemandStatus } from '@/services/ondemand/ondemandService';

// COMPONENT
export const AdminOnDemandMonitorPage = () => {
  // COMPOSABLES
  const { data, filters, actions } = useOnDemandOperations();

  const analysis = useOnDemandAnalytics();

  // COMPUTED
  const metrics = analysis.overview.data;

  // RENDER
  return <div className="space-y-6 pb-12">
    <ActionHeaderTA eyebrow="Operación a domicilio" title="Cada solicitud, bajo control" description="Detecta demoras, revisa la demanda y acompaña cada atención desde una sola vista." actions={<ButtonTA variant="outline" onClick={() => { void actions.refresh(); analysis.overview.refresh(); }} disabled={data.refreshing}><RefreshCw className={`size-4 ${data.refreshing ? 'animate-spin' : ''}`} />Actualizar</ButtonTA>} />
    {data.error && <StateTA error title="No pudimos actualizar el monitor" description={data.error} onRetry={actions.refresh} />}
    <DateRangeFilterTA value={analysis.filters.range} onChange={analysis.filters.setRange} />
    {analysis.overview.loading ? <div role="status" aria-label="Cargando analítica" className="h-80 animate-pulse rounded-2xl bg-muted" /> : analysis.overview.error ? <StateTA error title="Analítica no disponible" description={analysis.overview.error} onRetry={analysis.overview.refresh} /> : metrics && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Servicios activos', value: metrics.active, detail: 'Solicitudes creadas en el período que siguen activas' },
          { label: 'Servicios completados', value: metrics.completed, detail: 'Solicitudes del período que finalizaron' },
          { label: 'Tasa de finalización', value: metrics.completionRate === null ? 'Sin datos' : `${Math.round(metrics.completionRate)}%`, detail: 'Completados / (completados + cancelados)' },
          { label: 'Tiempo hasta aceptación', value: metrics.averageAcceptanceMinutes === null ? 'Sin datos' : `${metrics.averageAcceptanceMinutes.toFixed(1)} min`, detail: 'Promedio de solicitudes con aceptación registrada' },
        ].map(metric => <div key={metric.label} className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-2 text-3xl font-bold tracking-tight">{metric.value}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{metric.detail}</p></div>)}
      </div>
      {metrics.expired > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" /><div><p className="text-sm font-semibold">{metrics.expired} búsquedas vencieron sin asignación</p><p className="mt-1 text-xs text-muted-foreground">Revisa la cobertura y la disponibilidad de profesionales para reducir solicitudes sin atender.</p></div></div><ButtonTA variant="outline" onClick={() => filters.setStatus('SEARCHING')}>Revisar búsquedas</ButtonTA></div>}
      <OnDemandAnalyticsTA metrics={metrics} />
      <PanelTA title="Valor final de servicios completados" description="Solo valores finales registrados. No representa pagos recibidos ni utilidad neta.">
        <div className="flex flex-wrap gap-6 px-6 pb-6">{metrics.finalRevenue.length ? metrics.finalRevenue.map(revenue => <div key={revenue.currency}><p className="text-xs text-muted-foreground">{revenue.currency}</p><p className="mt-1 text-2xl font-bold">{formatHomeServicePrice(revenue.amount, revenue.currency)}</p></div>) : <p className="text-sm text-muted-foreground">Los servicios completados aún no tienen valores finales registrados.</p>}</div>
      </PanelTA>
    </>}
    <p className="text-xs text-muted-foreground">Gestión operativa: últimas {data.requests.length} solicitudes (máximo 100), independiente del período de análisis.{data.updatedAt && ` Actualizado a las ${data.updatedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}.`}</p>
    {data.loading ? <div role="status" aria-label="Cargando operación" className="h-40 animate-pulse rounded-2xl bg-muted" /> : <>
      <PanelTA title="Gestiona las solicitudes" description="Busca por cliente, profesional, código o dirección y consulta el detalle.">
        <div className="space-y-4 px-5 pb-5 md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" /><InputTA aria-label="Buscar solicitud" className="pl-9" placeholder="Cliente, profesional, código o dirección…" value={filters.query} onChange={event => filters.setQuery(event.target.value)} /></div><label className="sr-only" htmlFor="ondemand-status">Filtrar por estado</label><select id="ondemand-status" value={filters.status} onChange={event => filters.setStatus(event.target.value as OnDemandStatus | 'ALL')} className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><option value="ALL">Todos los estados</option>{Object.entries(HOME_SERVICE_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          {data.filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><caption className="sr-only">Solicitudes de servicio a domicilio</caption><thead className="border-b border-border text-xs text-muted-foreground"><tr>{['Solicitud / cliente', 'Profesional', 'Estado', 'Creada', 'Valor', 'Acción'].map(label => <th key={label} scope="col" className="px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{data.filtered.map(request => <tr key={request.id} className="hover:bg-secondary/40"><td className="px-3 py-4"><p className="font-semibold">{request.client?.name ?? 'Cliente'}</p><p className="mt-1 text-xs text-muted-foreground">{request.request_code}</p></td><td className="px-3 py-4">{request.professional?.name ?? 'Pendiente de aceptación'}</td><td className="px-3 py-4"><span className="rounded-full bg-secondary px-2.5 py-1.5 text-xs font-medium">{HOME_SERVICE_STATUS[request.status]}</span></td><td className="px-3 py-4 text-xs text-muted-foreground">{formatHomeServiceDate(request.created_at)}</td><td className="px-3 py-4 font-medium">{formatHomeServicePrice(request.final_price ?? request.estimated_price, request.currency)}<p className="text-[10px] font-normal text-muted-foreground">{request.final_price != null ? 'Final' : 'Estimado'}</p></td><td className="px-3 py-4"><ButtonTA variant="ghost" onClick={() => actions.select(request)} aria-label={`Ver solicitud ${request.request_code}`}>Ver<ArrowRight className="size-4" /></ButtonTA></td></tr>)}</tbody></table></div> : <StateTA title="No hay solicitudes para estos filtros" description="Prueba otro estado o busca un cliente diferente." />}
        </div>
      </PanelTA>
    </>}
    <Dialog open={data.selected !== null} onOpenChange={open => { if (!open) actions.select(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>Detalle de la solicitud</DialogTitle><DialogDescription>Estado, dirección y profesional de la atención seleccionada.</DialogDescription></DialogHeader>{data.selected && <><OnDemandReassignmentTA request={data.selected} refresh={actions.refresh} /><HomeServiceProgressTA request={data.selected} location={null} /></>}</DialogContent></Dialog>
  </div>;
};
