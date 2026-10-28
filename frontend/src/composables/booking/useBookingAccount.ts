import { useAuth } from "@/contexts/AuthContext";
import { useRequireAccount } from "@/modules/auth/composables/useRequireAccount";
import { bookingResumePath } from "@/composables/booking/resumePath";
import type {
  BookingAccountState,
  BookingContext,
  BookingFlowState,
} from "@/composables/booking/types";

// COMPOSABLE
export const useBookingAccount = (
  businessId: number,
  flow: BookingFlowState,
  promoCode: string,
  source?: BookingContext["source"],
): BookingAccountState => {
  // SERVICES
  const { user, permissions } = useAuth();
  const { identity, actions } = useRequireAccount();

  // COMPUTED
  const canBook =
    identity.authenticated &&
    (user?.role === "SUPERADMIN" ||
      permissions.includes("appointments.create"));

  // ACTIONS
  const requireAccount = (): boolean => {
    const { selection, journey } = flow;
    const slot = journey.selectedSlot;
    return actions.requireAccount(
      bookingResumePath(businessId, {
        serviceId: selection.serviceId ?? undefined,
        branchId: selection.branchId ?? undefined,
        professionalId:
          slot?.professional_id ?? selection.professionalId ?? undefined,
        resourceId: slot?.resource_id ?? selection.resourceId ?? undefined,
        date: selection.date,
        time: slot?.start_time.slice(0, 5) ?? selection.time,
        durationMinutes: slot?.duration_minutes ?? selection.durationMinutes,
        participants: selection.participants,
        promoCode,
        source,
      }),
    );
  };

  // EXPOSE
  return {
    identity: { authenticated: identity.authenticated, canBook },
    actions: { requireAccount },
  };
};
