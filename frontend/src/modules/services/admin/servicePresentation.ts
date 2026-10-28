import type { Service } from "@/types/models";

// LABELS
const bookingLabels: Record<NonNullable<Service["booking_model"]>, string> = {
  professional: "Con profesional",
  optional_professional: "Profesional opcional",
  resource: "Por recurso",
  direct: "Reserva directa",
  capacity: "Por capacidad",
};
export const serviceBookingLabel = (service: Service): string =>
  bookingLabels[
    service.booking_model ??
      (service.requires_professional === false ? "direct" : "professional")
  ];
const statusLabels: Record<string, string> = {
  COMPLETED: "Completadas",
  CANCELLED: "Canceladas",
  CONFIRMED: "Confirmadas",
  PENDING: "Pendientes",
  NO_SHOW: "No asistió",
  RESCHEDULED: "Reprogramadas",
};
export const serviceStatusLabel = (status: string): string =>
  statusLabels[status] ?? status;
