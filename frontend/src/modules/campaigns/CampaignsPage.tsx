import { LinkButtonTA } from "@/components/TA/LinkButtonTA";
import { ArrowUpRight, Mail, Plus, RefreshCw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { DashboardSkeletonTA, StateTA } from "@/components/TA/StateTA";
import { formatDate, formatNumber } from "@/i18n/formatters";
import {
  CampaignIntegrationTA,
  CampaignMetricTA,
  CampaignSelectTA,
  CampaignStatusTA,
} from "@/modules/campaigns/components/CampaignPrimitivesTA";
import {
  campaignStatuses,
  campaignTypes,
} from "@/modules/campaigns/campaignDomain";
import { useCampaignListing } from "@/modules/campaigns/composables/useCampaignListing";

// VIEW
export const CampaignsPage = () => {
  const { listing, filters, metrics } = useCampaignListing();
  return (
    <div className="page-enter space-y-6">
      <ActionHeaderTA
        eyebrow="Crecimiento · Comunicación"
        title="Campañas"
        description="Llega a la audiencia adecuada y sigue los resultados de cada correo."
        actions={
          <>
            <ButtonTA
              variant="outline"
              disabled={listing.loading}
              onClick={listing.refresh}
              aria-label="Actualizar campañas"
            >
              <RefreshCw className="size-4" />
            </ButtonTA>
            <LinkButtonTA
              to={`/admin/campaigns/new${filters.values.business_id ? `?business_id=${filters.values.business_id}` : ""}`}
            >
              <Plus className="size-4" />
              Nueva campaña
            </LinkButtonTA>
          </>
        }
      />
      {listing.options && (
        <CampaignIntegrationTA integration={listing.options.integration} />
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CampaignMetricTA
          label="Campañas"
          value={formatNumber(metrics.campaigns)}
          detail="Según los filtros seleccionados"
        />
        <CampaignMetricTA
          label="Borradores"
          value={formatNumber(metrics.drafts)}
          detail="Pendientes de revisar y enviar"
        />
        <CampaignMetricTA
          label="Correos aceptados"
          value={formatNumber(metrics.sent)}
          detail="Aceptados por el proveedor de correo"
        />
        <CampaignMetricTA
          label="Destinatarios previstos"
          value={formatNumber(metrics.recipients)}
          detail="Suma de audiencias al iniciar cada envío"
        />
      </div>
      <PanelTA
        title="Tus campañas"
        description="Abre una campaña para revisar su contenido, enviar o analizar resultados."
        action={
          <Link
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            to="/admin/promotions"
          >
            Administrar promociones y cupones
            <ArrowUpRight className="size-3.5" />
          </Link>
        }
      >
        <div className="grid gap-3 border-b border-border px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4 md:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <InputTA
              className="pl-9"
              value={filters.values.q}
              onChange={(event) => filters.update({ q: event.target.value })}
              placeholder="Buscar por asunto…"
              aria-label="Buscar campañas"
            />
          </div>
          <CampaignSelectTA
            aria-label="Filtrar por estado"
            value={filters.values.status}
            onChange={(event) => filters.update({ status: event.target.value })}
          >
            <option value="">Todos los estados</option>
            {Object.entries(campaignStatuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </CampaignSelectTA>
          <CampaignSelectTA
            aria-label="Filtrar por objetivo"
            value={filters.values.type}
            onChange={(event) => filters.update({ type: event.target.value })}
          >
            <option value="">Todos los objetivos</option>
            {Object.entries(campaignTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </CampaignSelectTA>
          <CampaignSelectTA
            aria-label="Filtrar por negocio"
            value={filters.values.business_id}
            onChange={(event) =>
              filters.update({ business_id: event.target.value })
            }
          >
            <option value="">Todos mis negocios</option>
            {listing.options?.businesses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </CampaignSelectTA>
        </div>
        {listing.error ? (
          <StateTA
            error
            title="No se pudieron cargar las campañas"
            description={listing.error}
            onRetry={listing.refresh}
          />
        ) : listing.loading ? (
          <div className="p-5">
            <DashboardSkeletonTA />
          </div>
        ) : listing.items.length ? (
          <div className="divide-y divide-border">
            {listing.items.map((campaign) => (
              <article
                key={campaign.id}
                className="group flex flex-wrap items-center gap-4 px-5 py-5 transition-colors hover:bg-secondary/25 md:px-6"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Mail className="size-5" />
                </span>
                <div className="min-w-0 flex-1 basis-56">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to={`/admin/campaigns/${campaign.id}`}
                      className="font-semibold tracking-tight hover:text-primary"
                    >
                      {campaign.subject}
                    </Link>
                    <CampaignStatusTA status={campaign.status} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {campaignTypes[campaign.type]} ·{" "}
                    {campaign.target_role === "CLIENTE"
                      ? "Clientes"
                      : "Profesionales"}{" "}
                    ·{" "}
                    {campaign.sent_at
                      ? `Enviada ${formatDate(campaign.sent_at)}`
                      : `Creada ${formatDate(campaign.created_at)}`}
                  </p>
                </div>
                <div className="min-w-28 text-sm">
                  <p className="font-semibold tabular-nums">
                    {formatNumber(campaign.sent_count)}{" "}
                    <span className="font-normal text-muted-foreground">
                      / {formatNumber(campaign.recipients_count)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    correos aceptados
                  </p>
                </div>
                <LinkButtonTA
                  variant="outline"
                  to={`/admin/campaigns/${campaign.id}`}
                >
                  Ver campaña
                  <ArrowUpRight className="size-4" />
                </LinkButtonTA>
              </article>
            ))}
          </div>
        ) : (
          <div className="space-y-2 px-5 py-14 text-center">
            <Mail className="mx-auto mb-4 size-8 text-muted-foreground" />
            <h3 className="font-semibold">No hay campañas con estos filtros</h3>
            <p className="text-sm text-muted-foreground">
              Crea tu primera campaña o ajusta la búsqueda.
            </p>
            <ButtonTA
              variant="link"
              onClick={() =>
                filters.update({ q: "", status: "", type: "", business_id: "" })
              }
            >
              Limpiar filtros
            </ButtonTA>
          </div>
        )}
      </PanelTA>
    </div>
  );
};
