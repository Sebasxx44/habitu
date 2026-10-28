import { ArrowRight, House, RefreshCw } from 'lucide-react';
import { ExpressPage } from '@/modules/marketplace/ExpressPage';
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA';
import { ButtonTA } from '@/components/TA/ButtonTA';
import { PanelTA } from '@/components/TA/PanelTA';
import { StateTA } from '@/components/TA/StateTA';
import { HomeServiceFormTA } from '@/modules/home-service/components/HomeServiceFormTA';
import { HomeServiceProgressTA } from '@/modules/home-service/components/HomeServiceProgressTA';
import { useHomeServiceLocation } from '@/modules/home-service/composables/useHomeServiceLocation';
import { useHomeServiceRequests } from '@/modules/home-service/composables/useHomeServiceRequests';
import { useHomeServiceForm } from '@/modules/home-service/composables/useHomeServiceForm';
import { useHomeServiceCancellation } from '@/modules/home-service/composables/useHomeServiceCancellation';
import { HOME_SERVICE_STATUS, formatHomeServiceDate, homeServicePoint, isHomeServiceActive } from '@/modules/home-service/helpers';

// COMPONENTS
export const OnDemandRequestPage = () => <ExpressPage />;

export const HomeServiceRequestPage = () => {
  // COMPOSABLES
  const location = useHomeServiceLocation();
  const requests = useHomeServiceRequests();
  const form = useHomeServiceForm(location.point, requests.replace);
  const cancellation = useHomeServiceCancellation(requests.selected, requests.replace);

  // ACTIONS
  const startNew = () => {
    const point = homeServicePoint(requests.selected?.client_lat, requests.selected?.client_lng);
    if (point) location.select(point);
    form.reset(requests.selected?.client_address ?? undefined);
    requests.select(null);
  };

  // RENDER
  return <div className="mx-auto max-w-7xl space-y-7 px-4 py-7 pb-20 text-foreground sm:px-6 lg:py-10">
    <ActionHeaderTA eyebrow="Bienestar donde estás" title="Tu próximo servicio, en casa" description="Elige lo que necesitas, marca tu dirección y sigue cada paso de tu atención." actions={<ButtonTA variant="outline" onClick={() => void requests.refresh()} disabled={requests.refreshing}><RefreshCw className={`size-4 ${requests.refreshing ? 'animate-spin' : ''}`} />Actualizar</ButtonTA>} />
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4">
      <p className="flex items-center gap-3 text-sm"><House className="size-5 shrink-0 text-primary" />{requests.selected ? `Seguimiento de ${requests.selected.request_code}` : 'Atención a domicilio, con todo claro antes de empezar.'}</p>
      {requests.updatedAt && <span className="text-xs text-muted-foreground" role="status">Última actualización {requests.updatedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>}
    </div>
    {requests.error && <StateTA error title="No pudimos actualizar tus solicitudes" description={requests.error} onRetry={requests.refresh} />}
    {requests.loading ? <div className="grid animate-pulse gap-6 lg:grid-cols-[1.35fr_0.8fr]" role="status" aria-label="Cargando solicitudes"><div className="h-96 rounded-2xl bg-muted" /><div className="h-80 rounded-2xl bg-muted" /></div> : requests.selected ? <HomeServiceProgressTA request={requests.selected} location={requests.professionalLocation} cancellation={cancellation} onNew={startNew} /> : <HomeServiceFormTA form={form} location={location} />}
    {requests.requests.length > 0 && <PanelTA title="Tus solicitudes" description="Retoma un servicio activo o consulta una atención anterior.">
      <ul className="divide-y divide-border px-5 pb-2 md:px-6">
        {requests.requests.slice(0, 8).map(request => <li key={request.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{request.service?.name ?? request.description?.split(':')[0] ?? 'Servicio a domicilio'} <span className="ml-1 text-xs font-normal text-muted-foreground">{request.request_code}</span></p><p className="mt-1 text-xs text-muted-foreground">{formatHomeServiceDate(request.created_at)} · {request.client_address}</p></div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isHomeServiceActive(request) ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{HOME_SERVICE_STATUS[request.status]}</span>
          <ButtonTA variant="ghost" onClick={() => requests.select(request)} aria-label={`Ver solicitud ${request.request_code}`} disabled={requests.selected?.id === request.id}>Ver<ArrowRight className="size-4" /></ButtonTA>
        </li>)}
      </ul>
    </PanelTA>}
  </div>;
};
