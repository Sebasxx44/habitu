import type {
  CampaignAnalytics,
  CampaignAudience,
  CampaignDraft,
  CampaignRecord,
  CampaignStatus,
  CampaignType,
} from "@/modules/campaigns/types";

// CONFIGURATION
export const campaignStatuses: Record<CampaignStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "En cola",
  PROCESSING: "Enviando",
  COMPLETED: "Finalizada",
  FAILED: "Con errores",
  SENT: "Enviada",
  SENDING: "Enviando",
  SCHEDULED: "Programada",
};
export const campaignTypes: Record<CampaignType, string> = {
  PROMO: "Promoción",
  NEWS: "Novedades",
  REMINDER: "Recordatorio",
  CUSTOM: "Personalizada",
};
export const emptyCampaign = (): CampaignDraft => ({
  business_id: 0,
  subject: "",
  body: "",
  type: "PROMO",
  target_role: "CLIENTE",
  target_ids: [],
  segment: {},
  promotion_id: null,
});

// VALIDATION
export const campaignValidation = (form: CampaignDraft): string | null => {
  if (!form.business_id) return "Selecciona el negocio de la campaña.";
  if (!form.subject.trim()) return "Escribe el asunto del correo.";
  if (form.subject.length > 255)
    return "El asunto admite hasta 255 caracteres.";
  if (
    !form.body
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim()
  )
    return "Escribe el contenido del correo.";
  const segment = form.segment;
  if (
    segment.age_min !== undefined &&
    segment.age_max !== undefined &&
    segment.age_min > segment.age_max
  )
    return "La edad mínima no puede superar la máxima.";
  if (
    segment.min_visits !== undefined &&
    segment.max_visits !== undefined &&
    segment.min_visits > segment.max_visits
  )
    return "Las visitas mínimas no pueden superar las máximas.";
  if (
    segment.joined_after &&
    segment.joined_before &&
    segment.joined_after > segment.joined_before
  )
    return "Revisa el rango de fechas de registro.";
  return null;
};
export const canEditCampaign = (campaign: CampaignRecord): boolean =>
  campaign.status === "DRAFT";
export const campaignDraftFrom = (campaign: CampaignRecord): CampaignDraft => ({
  business_id: campaign.business_id,
  subject: campaign.subject,
  body: campaign.body,
  type: campaign.type,
  target_role: campaign.target_role,
  target_ids: campaign.target_ids ?? [],
  segment: campaign.segment ?? {},
  promotion_id: campaign.promotion_id ?? null,
});

// RETRY SNAPSHOT
export const campaignRetryAudience = (
  stats: CampaignAnalytics,
): CampaignAudience => ({
  total_recipients: stats.failed + stats.pending,
  recipients: stats.logs
    .filter((log) => ["FAILED", "QUEUED"].includes(log.status))
    .slice(0, 50)
    .map((log) => ({
      id: log.id,
      name: log.recipient_name,
      email: log.recipient_email,
    })),
  summary: {
    matching: stats.failed + stats.pending,
    excluded: 0,
    preview_limit: 50,
  },
});
