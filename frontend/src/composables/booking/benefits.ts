import type { BenefitsCatalog } from "@/modules/benefits/types";
import type {
  BookingBenefitContext,
  BookingBenefitSelection,
} from "@/composables/booking/benefitTypes";

// SELECTION
export const selectBookingBenefits = (
  data: BenefitsCatalog | null,
  context: BookingBenefitContext,
): BookingBenefitSelection => {
  if (!data || !context.serviceId)
    return { promotions: [], programs: [], memberships: [], plans: [] };
  const { serviceId } = context;
  const appointmentTime = Date.parse(
    `${context.date}T${context.time.slice(0, 5)}:00-05:00`,
  );
  return {
    promotions: data.promotions.filter(
      (promotion) =>
        promotion.business.id === context.businessId &&
        promotion.eligible &&
        !!promotion.code &&
        context.date >= promotion.starts_at &&
        context.date <= promotion.expires_at &&
        (promotion.remaining_for_you === null ||
          promotion.remaining_for_you > 0) &&
        (promotion.remaining_uses === null || promotion.remaining_uses > 0) &&
        (context.subtotal === null ||
          promotion.min_purchase <= context.subtotal) &&
        (!promotion.services.length ||
          promotion.services.some(
            (service) => service.id === context.serviceId,
          )),
    ),
    programs: data.programs.filter(
      (program) =>
        program.business.id === context.businessId &&
        (!program.expires_at || context.date <= program.expires_at) &&
        (!program.service || program.service.id === context.serviceId) &&
        (!program.professional ||
          program.professional.id === context.professionalId) &&
        (!program.card || program.card.status === "ACTIVE"),
    ),
    memberships: data.memberships.filter((membership) => {
      const terms = membership.plan_snapshot ?? membership.plan;
      return (
        membership.plan.business_id === context.businessId &&
        membership.status === "ACTIVE" &&
        appointmentTime >= Date.parse(membership.starts_at) &&
        appointmentTime < Date.parse(membership.ends_at) &&
        (!terms.included_services?.length ||
          terms.included_services.includes(serviceId)) &&
        (membership.appointments_remaining > 0 ||
          Number(terms.discount_percentage) > 0)
      );
    }),
    plans: data.plans.filter(
      (plan) =>
        plan.business_id === context.businessId &&
        plan.is_active &&
        (!plan.included_services?.length ||
          plan.included_services.includes(serviceId)),
    ),
  };
};
