import type { AssistantCard, AssistantSlot } from "@/modules/assistant/types";

// ACTIONS
export const assistantBookingLink = (
  card: AssistantCard,
  slot?: AssistantSlot,
): string => {
  const params = new URLSearchParams({
    book: "1",
    source: "assistant",
    service_id: String(card.service_id),
    branch_id: String(card.branch_id),
  });
  if (card.date) params.set("date", card.date);
  const professionalId = slot?.professional_id ?? card.professional_id;
  if (professionalId) params.set("professional_id", String(professionalId));
  if (slot) params.set("time", slot.start_time.slice(0, 5));
  const resourceId = slot?.resource_id ?? card.resource_id;
  if (resourceId) params.set("resource_id", String(resourceId));
  if (slot?.duration_minutes ?? card.duration_minutes) params.set("duration_minutes", String(slot?.duration_minutes ?? card.duration_minutes));
  if (slot?.participants ?? card.participants) params.set("participants", String(slot?.participants ?? card.participants));
  if (card.promotion?.code) params.set("promo_code", card.promotion.code);
  return `/cliente/business/${card.business_id}?${params}`;
};
