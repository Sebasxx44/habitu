import type {
  BookingBranch,
  BookingBusiness,
  BookingContext,
  BookingProfessional,
  BookingSelection,
  BookingService,
  BookingStep,
} from "@/composables/booking/types";
import type { Resource } from "@/types/models";
import { bookingDurations, bookingModel, hasProfessionalChoice } from '@/composables/booking/policy';

// VALIDATION
export const isBookingDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};
export const isBookingTime = (value: string): boolean =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

// CONTEXT
export const resolveBookingContext = (
  business: BookingBusiness,
  services: BookingService[],
  professionals: BookingProfessional[],
  resources: Resource[],
  branches: BookingBranch[],
  initial: BookingContext,
  today: string,
): {
  selection: BookingSelection;
  step: BookingStep;
  notice: string | null;
} => {
  const service = services.find(
    (entry) => entry.id === initial.serviceId && entry.is_active !== false,
  );
  const branch =
    branches.find((entry) => entry.id === initial.branchId) ??
    branches.find((entry) => entry.is_main_branch) ??
    branches[0];
  const compatible =
    service?.professionals ??
    professionals.filter(
      (entry) =>
        !service ||
        !entry.services ||
        entry.services.some((item) => item.id === service.id),
    );
  const usesProfessional = hasProfessionalChoice(service, business);
  const model = bookingModel(service, business);
  const professional = usesProfessional ? compatible.find(
    (entry) =>
      entry.id === initial.professionalId &&
      entry.is_active !== false &&
      (!entry.branch_ids?.length ||
        entry.branch_ids.includes(branch?.id ?? -1)),
  ) : undefined;
  const resource = resources.find(
    (entry) =>
      entry.id === initial.resourceId &&
      entry.is_active !== false &&
      entry.branch_id === branch?.id &&
      (model === 'resource' ? service?.resources?.some(resource => resource.id === entry.id) === true : !service?.resources?.length || service.resources.some(resource => resource.id === entry.id)),
  );
  const validDate =
    !!initial.date && isBookingDate(initial.date) && initial.date >= today;
  const validTime = !!initial.time && isBookingTime(initial.time);
  const missingProfessional = usesProfessional && initial.professionalId != null && !professional;
  const missingResource = (model === 'resource' || (!service?.booking_model && business.uses_resources)) && !resource;
  const durations = bookingDurations(service);
  // Fixed professional durations can be overridden by the provider. Availability
  // and the quote validate the actual duration before a booking can be submitted.
  const professionalDuration = usesProfessional && service?.duration_mode !== 'selectable' && Number.isInteger(initial.durationMinutes) && (initial.durationMinutes ?? 0) > 0 && (initial.durationMinutes ?? 0) <= 1440;
  const validDuration = durations.includes(initial.durationMinutes ?? -1) || professionalDuration;
  const durationMinutes = validDuration ? initial.durationMinutes! : durations[0];
  const changed =
    (!!initial.serviceId && !service) ||
    (!!initial.branchId && initial.branchId !== branch?.id) ||
    missingProfessional ||
    (!!initial.resourceId && !resource) ||
    (initial.durationMinutes != null && !validDuration) ||
    (initial.participants != null && (!Number.isInteger(initial.participants) || initial.participants < 1 || (model === 'capacity' && initial.participants > (service?.booking_capacity ?? 1)))) ||
    (!!initial.date && !validDate) ||
    (!!initial.time && !validTime);
  const selection: BookingSelection = {
    serviceId: service?.id ?? null,
    branchId: branch?.id ?? null,
    professionalId: professional?.id ?? null,
    resourceId: resource?.id ?? null,
    date: validDate ? initial.date! : today,
    time: validDate && validTime && !changed ? initial.time! : "",
    durationMinutes,
    participants: model === 'capacity' ? Math.max(1, Math.min(service?.booking_capacity ?? 1, Math.floor(initial.participants ?? 1))) : 1,
  };
  const needsAttention = usesProfessional;
  const step: BookingStep = !service
    ? "service"
    : missingProfessional || (missingResource && usesProfessional)
      ? "professional"
      : selection.time && !missingResource
        ? "review"
        : needsAttention
          ? "professional"
          : "datetime";
  return {
    selection,
    step,
    notice: changed
      ? "Parte de la selección del enlace ya no está disponible. Revisa el servicio, la atención y la fecha antes de continuar."
      : null,
  };
};
