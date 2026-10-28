import { LinkButtonTA } from "@/components/TA/LinkButtonTA";
import { ArrowLeft, Copy, Pencil, RefreshCw, Send, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { DashboardSkeletonTA, StateTA } from "@/components/TA/StateTA";
import { formatNumber } from "@/i18n/formatters";
import { CampaignAudiencePreviewTA } from "@/modules/campaigns/components/CampaignAudienceTA";
import { CampaignEmailPreviewTA } from "@/modules/campaigns/components/CampaignEmailPreviewTA";
import {
  CampaignIntegrationTA,
  CampaignStatusTA,
} from "@/modules/campaigns/components/CampaignPrimitivesTA";
import { CampaignPerformanceTA } from "@/modules/campaigns/components/CampaignPerformanceTA";
import {
  campaignDraftFrom,
  campaignRetryAudience,
  campaignTypes,
  canEditCampaign,
  emptyCampaign,
} from "@/modules/campaigns/campaignDomain";
import { useCampaignAudience } from "@/modules/campaigns/composables/useCampaignAudience";
import { useCampaignDetail } from "@/modules/campaigns/composables/useCampaignDetail";

// VIEW
export const CampaignDetailPage = () => {
  const { id = "" } = useParams<{ id: string }>();
  const { detail, operation } = useCampaignDetail(id);
  const campaign = detail.campaign;
  const editable = campaign ? canEditCampaign(campaign) : false;
  const sendable = campaign
    ? ["DRAFT", "FAILED"].includes(campaign.status)
    : false;
  const liveAudience = useCampaignAudience(
    campaign ? campaignDraftFrom(campaign) : emptyCampaign(),
    campaign?.status === "DRAFT",
  );
  const audience =
    campaign?.status === "FAILED" && detail.stats
      ? {
          data: campaignRetryAudience(detail.stats),
          loading: false,
          error: null,
        }
      : liveAudience;
  const integrationReady =
    detail.options?.integration.configured &&
    detail.options.integration.delivery_enabled;
  const promotion = detail.options?.promotions.find(
    (item) => item.id === campaign?.promotion_id,
  );
  return (
    <div className="page-enter space-y-6">
      <ActionHeaderTA
        eyebrow="Campañas · Seguimiento"
        title={campaign?.subject ?? "Detalle de campaña"}
        description={
          campaign
            ? `${campaignTypes[campaign.type]} · ${campaign.target_role === "CLIENTE" ? "Clientes" : "Profesionales"}`
            : "Contenido, audiencia y resultados."
        }
        actions={
          <>
            <LinkButtonTA variant="outline" to="/admin/campaigns">
              <ArrowLeft className="size-4" />
              Campañas
            </LinkButtonTA>
            <ButtonTA
              variant="outline"
              disabled={detail.loading}
              onClick={detail.refresh}
              aria-label="Actualizar resultados"
            >
              <RefreshCw className="size-4" />
            </ButtonTA>
            {editable && (
              <LinkButtonTA
                variant="outline"
                to={`/admin/campaigns/${id}/edit`}
              >
                <Pencil className="size-4" />
                Editar
              </LinkButtonTA>
            )}
            {campaign && (
              <LinkButtonTA
                variant="outline"
                to={`/admin/campaigns/new?copy_from=${campaign.id}`}
              >
                <Copy className="size-4" />
                Duplicar
              </LinkButtonTA>
            )}
          </>
        }
      />
      {detail.error ? (
        <StateTA
          error
          title="No se pudo cargar la campaña"
          description={detail.error}
          onRetry={detail.refresh}
        />
      ) : !campaign || !detail.stats || !detail.options ? (
        <DashboardSkeletonTA />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CampaignStatusTA status={campaign.status} />
            <div className="flex flex-wrap gap-2">
              {editable && (
                <ButtonTA
                  variant="ghost"
                  className="text-destructive"
                  disabled={operation.busy}
                  onClick={() => operation.confirm("delete")}
                >
                  <Trash2 className="size-4" />
                  Eliminar borrador
                </ButtonTA>
              )}
              {sendable && (
                <ButtonTA
                  disabled={
                    operation.busy ||
                    !integrationReady ||
                    audience.loading ||
                    !audience.data?.total_recipients
                  }
                  onClick={() => operation.confirm("send")}
                >
                  <Send className="size-4" />
                  {campaign.status === "FAILED"
                    ? "Revisar reintento"
                    : "Revisar envío"}
                </ButtonTA>
              )}
            </div>
          </div>
          {operation.confirmation && (
            <section
              className={`rounded-2xl border p-5 ${operation.confirmation === "delete" ? "border-destructive/30 bg-destructive/5" : "border-primary/25 bg-primary/5"}`}
              aria-label="Confirmar operación"
            >
              <h2 className="font-semibold">
                {operation.confirmation === "send"
                  ? `Enviar a ${formatNumber(audience.data?.total_recipients ?? 0)} contactos`
                  : "Eliminar este borrador"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {operation.confirmation === "send"
                  ? "Se enviará el correo guardado con el enlace de reserva. El envío comienza en segundo plano y no se puede deshacer. Los destinatarios ya procesados se omiten al reintentar."
                  : "Se eliminará la campaña guardada. Esta acción no se puede deshacer."}
              </p>
              {operation.error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {operation.error}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonTA
                  variant={
                    operation.confirmation === "delete"
                      ? "destructive"
                      : "default"
                  }
                  disabled={
                    operation.busy ||
                    (operation.confirmation === "send" &&
                      (!integrationReady ||
                        audience.loading ||
                        !audience.data?.total_recipients))
                  }
                  onClick={() => void operation.execute()}
                >
                  {operation.busy
                    ? "Procesando…"
                    : operation.confirmation === "send"
                      ? "Confirmar y enviar"
                      : "Eliminar definitivamente"}
                </ButtonTA>
                <ButtonTA
                  variant="outline"
                  disabled={operation.busy}
                  onClick={() => operation.confirm(null)}
                >
                  Cancelar
                </ButtonTA>
              </div>
            </section>
          )}
          <CampaignIntegrationTA integration={detail.options.integration} />
          <CampaignPerformanceTA
            stats={detail.stats}
            businessId={campaign.business_id}
          />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <CampaignEmailPreviewTA
              subject={campaign.subject}
              body={campaign.body}
              promotion={promotion}
            />
            {sendable ? (
              <CampaignAudiencePreviewTA audience={audience} />
            ) : (
              <PanelTA
                title="Audiencia del envío"
                description="La audiencia queda fijada al iniciar el procesamiento."
              >
                <div className="space-y-3 px-5 pb-5">
                  <p className="text-3xl font-semibold">
                    {formatNumber(campaign.recipients_count)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    destinatarios previstos
                  </p>
                  {campaign.promotion_id && (
                    <Link
                      className="text-sm text-primary hover:underline"
                      to={`/admin/promotions/${campaign.promotion_id}/edit?business_id=${campaign.business_id}`}
                    >
                      Consultar cupón vinculado
                    </Link>
                  )}
                </div>
              </PanelTA>
            )}
          </div>
        </>
      )}
    </div>
  );
};
