import { OnDemandQuoteTA } from '@/modules/home-service/components/OnDemandQuoteTA';
import { useTranslation } from 'react-i18next';
import { useOnDemandPresence } from '@/modules/home-service/composables/useOnDemandPresence';
import { ReservationSupportTA } from '@/modules/reservation-support/components/ReservationSupportTA';
import { CheckCircle2, LocateFixed, MapPin, RefreshCw, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA';
import { ButtonTA } from '@/components/TA/ButtonTA';
import { InputTA } from '@/components/TA/InputTA';
import { PanelTA } from '@/components/TA/PanelTA';
import { StateTA } from '@/components/TA/StateTA';
import { useOnDemandOperations } from '@/modules/home-service/composables/useOnDemandOperations';
import { useHomeServiceClock } from '@/modules/home-service/composables/useHomeServiceClock';
import { useProfessionalLocation } from '@/modules/home-service/composables/useProfessionalLocation';
import { HOME_SERVICE_STATUS, formatHomeServiceDate, formatHomeServicePrice, homeServicePoint, isHomeServiceExpired } from '@/modules/home-service/helpers';
import type { OnDemandStatus } from '@/services/ondemand/ondemandService';

// CONSTANTS
const actionLabels: Partial<Record<OnDemandStatus, string>> = { SEARCHING: 'Aceptar solicitud', ACCEPTED: 'Iniciar desplazamiento', ON_THE_WAY: 'Llegué · iniciar servicio', IN_PROGRESS: 'Completar servicio' };

// COMPONENT
export const ProfessionalOnDemandPage = () => {
  // COMPOSABLES
  const { data, filters, actions, completion } = useOnDemandOperations(true);
  const tracking = useProfessionalLocation();
  const presence = useOnDemandPresence(actions.refresh);
  const { i18n } = useTranslation();
  const english = i18n.language.startsWith("en");
  const now = useHomeServiceClock();

  // RENDER
  return <div className="space-y-6 pb-12">
    <ActionHeaderTA eyebrow="Tu operación a domicilio" title="Atiende cerca. Organiza tu día." description="Revisa la dirección, prepara tu atención y actualiza cada paso para acompañar a tu cliente." actions={<ButtonTA variant="outline" onClick={() => void actions.refresh()} disabled={data.refreshing}><RefreshCw className={`size-4 ${data.refreshing ? 'animate-spin' : ''}`} />Actualizar</ButtonTA>} />
    <PanelTA title={english ? "Availability for new offers" : "Disponibilidad para nuevas ofertas"} description={english ? "Pauses and declines do not cause automatic penalties." : "Las pausas y rechazos no generan sanciones automáticas."} action={<ButtonTA variant="outline" disabled={presence.data.busy} onClick={() => void presence.actions.toggle()}>{presence.data.paused ? (english ? "Resume offers" : "Reanudar ofertas") : (english ? "Pause offers" : "Pausar ofertas")}</ButtonTA>}><p className="px-5 pb-5 text-xs" role="status">{presence.data.error ? (english ? "Could not update availability." : "No se pudo actualizar la disponibilidad.") : presence.data.paused ? (english ? "Paused" : "En pausa") : (english ? "Available" : "Disponible")}</p></PanelTA>
    <PanelTA title="Ubicación para tus servicios" description="Comparte tu posición mientras tienes esta página visible. Puedes desactivarla en cualquier momento." action={<ButtonTA variant={tracking.enabled ? 'default' : 'outline'} aria-pressed={tracking.enabled} onClick={() => tracking.setEnabled(!tracking.enabled)}><LocateFixed className="size-4" />{tracking.enabled ? 'Desactivar ubicación' : 'Compartir mi ubicación'}</ButtonTA>}>
      <div className="px-5 pb-5 text-xs text-muted-foreground md:px-6" role="status">{tracking.error ? <p className="text-destructive">{tracking.error}</p> : tracking.sending ? 'Actualizando tu ubicación…' : tracking.enabled ? tracking.lastSentAt ? `Ubicación compartida a las ${tracking.lastSentAt.toLocaleTimeString('es-CO')}.` : 'Esperando tu ubicación…' : 'Tu ubicación no se está compartiendo desde esta página.'}</div>
    </PanelTA>
    <div className="flex flex-wrap justify-between gap-3 rounded-2xl border border-border px-5 py-4 text-sm"><p className="text-muted-foreground">Consulta tus ingresos confirmados y el estado de tus retiros.</p><Link to="/professional/earnings" className="font-semibold text-primary underline underline-offset-4">Ver ganancias</Link></div>
    {data.error && <StateTA error title="No pudimos cargar las solicitudes" description={data.error} onRetry={actions.refresh} />}
    <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" /><InputTA aria-label="Buscar servicios a domicilio" value={filters.query} onChange={event => filters.setQuery(event.target.value)} className="pl-9" placeholder="Buscar dirección, cliente o servicio…" /></div><select aria-label="Estado de solicitudes" value={filters.status} onChange={event => filters.setStatus(event.target.value as OnDemandStatus | 'ALL')} className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><option value="ALL">Todas las activas</option>{(['SEARCHING', 'ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'] as const).map(status => <option key={status} value={status}>{HOME_SERVICE_STATUS[status]}</option>)}</select></div>
    {data.loading ? <div role="status" aria-label="Cargando servicios" className="h-72 animate-pulse rounded-2xl bg-muted" /> : data.filtered.length === 0 ? <StateTA title="No hay solicitudes en esta vista" description="Las nuevas ofertas y tus servicios activos aparecerán aquí. Puedes cambiar los filtros o actualizar." /> : <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{data.filtered.map(request => {
      const point = homeServicePoint(request.client_lat, request.client_lng);
      const expired = isHomeServiceExpired(request, now);
      return <PanelTA key={request.id} title={request.service?.name ?? request.client?.name ?? 'Servicio a domicilio'} description={`${request.request_code} · ${formatHomeServiceDate(request.created_at)}`} action={<span className="rounded-full bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary">{HOME_SERVICE_STATUS[request.status]}</span>}>
        <div className="space-y-4 px-5 pb-5 md:px-6">
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{request.description ?? 'Consulta los detalles con el cliente antes de comenzar.'}</p>
          <p className="flex items-start gap-2 text-sm"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" />{request.client_address ?? 'Dirección no registrada'}</p>
          {point && request.status !== 'SEARCHING' && <a href={`https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4">Abrir indicaciones de llegada</a>}
          <div className="rounded-xl bg-secondary/50 p-4"><p className="text-xs text-muted-foreground">Valor estimado del servicio</p><p className="mt-1 text-xl font-bold">{formatHomeServicePrice(request.estimated_price, request.currency)}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Confirma el alcance y el valor con el cliente antes de comenzar.</p></div>
          {request.offer_details && <div className="space-y-1 text-xs text-muted-foreground"><p>{english ? "Duration" : "Duración"}: {request.offer_details.duration_minutes ?? '—'} min</p><p>{english ? "Estimated travel (distance, not live traffic)" : "Traslado estimado (distancia, sin tráfico en vivo)"}: {request.offer_details.travel_estimate_minutes ? `${request.offer_details.travel_estimate_minutes.min}–${request.offer_details.travel_estimate_minutes.max} min` : '—'}</p><p>{english ? "Your share" : "Tu participación"}: {request.offer_details.professional_percentage}% · {english ? "Estimated net" : "Neto previsto"}: {formatHomeServicePrice(request.offer_details.professional_net_estimate, request.currency)}</p><p>{english ? "Business share" : "Participación del negocio"}: {formatHomeServicePrice(request.offer_details.business_share_estimate, request.currency)}</p><p>{english ? "Materials: confirm before service." : "Materiales: confirmar antes de atender."}</p></div>}
          {request.status === 'SEARCHING' && request.search_expires_at && <p className={`text-xs ${expired ? 'text-destructive' : 'text-muted-foreground'}`}>{expired ? 'La oferta venció. Actualiza para consultar nuevas solicitudes.' : `Oferta disponible hasta ${formatHomeServiceDate(request.search_expires_at)}.`}</p>}
          {request.status !== 'SEARCHING' && <OnDemandQuoteTA key={`${request.id}-${request.metadata?.price_quote?.id ?? 'quote'}`} request={request} professional onChanged={actions.refresh} />}
          {request.status === 'IN_PROGRESS' && <div><label htmlFor={`home-service-final-${request.id}`} className="mb-2 block text-sm font-medium">Valor final acordado ({request.currency ?? 'COP'})</label><InputTA id={`home-service-final-${request.id}`} type="number" min={0} max={9999999999.99} step="0.01" inputMode="decimal" value={completion.finalPrices[request.id] ?? ''} onChange={event => completion.setFinalPrice(request.id, event.target.value)} placeholder="Registra el valor del servicio" disabled={actions.busyId !== null} /><p className="mt-1 text-xs text-muted-foreground">Se registra para el resumen del servicio; no realiza un cobro.</p></div>}
          {request.status === 'SEARCHING' && <ButtonTA variant="outline" className="w-full" disabled={presence.data.busy || expired} onClick={() => void presence.actions.reject(request.id)}>{english ? "Decline offer" : "Rechazar oferta"}</ButtonTA>}
          {request.status !== 'SEARCHING' && <details><summary className="cursor-pointer text-sm font-semibold">{english ? "Conversation, check-in and support" : "Conversación, llegada y soporte"}</summary><div className="mt-3"><ReservationSupportTA key={request.id} kind="on-demand" id={request.id} /></div></details>}
          <ButtonTA className="w-full" disabled={actions.busyId !== null || expired} onClick={() => void actions.advance(request)}><CheckCircle2 className="size-4" />{actions.busyId === request.id ? 'Guardando…' : actionLabels[request.status]}</ButtonTA>
        </div>
      </PanelTA>;
    })}</div>}
  </div>;
};
