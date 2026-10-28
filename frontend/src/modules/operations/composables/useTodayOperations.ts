import { useAuth } from "@/contexts/AuthContext";
import type {
  OperationsContext,
  TodayOperationsResult,
} from "@/modules/operations/types";

// COMPOSABLE
export const useTodayOperations = (
  context: OperationsContext,
): TodayOperationsResult => {
  // SERVICES
  const { user } = useAuth();
  // COMPUTED
  const active = context.today.appointments.filter((item) =>
    ["PENDING", "CONFIRMED", "RESCHEDULED"].includes(item.status),
  );
  const minute = (value: string) =>
    Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  const professional = user?.role === "PROFESSIONAL";
  // EXPOSE
  return {
    attention: {
      next: active.filter((item) => item.end_time > context.today.time),
      arrivals: active.filter((item) => item.checked_in_at),
      delayed: active.filter(
        (item) => !item.checked_in_at && item.start_time < context.today.time,
      ),
      unpaid: context.today.appointments.filter(
        (item) =>
          !["CANCELLED", "NO_SHOW"].includes(item.status) &&
          !["PAID", "REFUNDED"].includes(item.payment_status),
      ),
      recoverable: context.today.appointments.filter(
        (item) =>
          item.status === "CANCELLED" && item.start_time > context.today.time,
      ),
    },
    resources: context.resources.map((resource) => {
      const appointments = context.today.appointments.filter(
        (item) =>
          item.resource_id === resource.id &&
          !["CANCELLED", "NO_SHOW"].includes(item.status),
      );
      return {
        id: resource.id,
        name: resource.name,
        minutes: appointments.reduce(
          (sum, item) => sum + minute(item.end_time) - minute(item.start_time),
          0,
        ),
        reservations: appointments.length,
        active: resource.is_active,
      };
    }),
    actions: {
      agenda: (branchId, appointmentId) =>
        `${professional ? "/professional/appointments" : "/admin/appointments"}?${new URLSearchParams({ date: context.today.date, ...(branchId ? { branch_id: String(branchId) } : {}), ...(appointmentId ? { appointment_id: String(appointmentId) } : {}) })}`,
      onDemand: professional ? "/professional/on-demand" : "/admin/on-demand",
    },
  };
};
