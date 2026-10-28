import { useState } from "react";
import { useBookingAvailability } from "@/composables/useBookingAvailability";
import { resolveBookingContext } from "@/composables/booking/context";
import type {
  BookingBranch,
  BookingBusiness,
  BookingContext,
  BookingFlowState,
  BookingProfessional,
  BookingSelection,
  BookingService,
  BookingStep,
} from "@/composables/booking/types";
import type { Resource } from "@/types/models";
import { bookingDurations, bookingModel, hasProfessionalChoice } from '@/composables/booking/policy';

// COMPOSABLE
export const useBookingSelection = (
  business: BookingBusiness,
  services: BookingService[],
  professionals: BookingProfessional[],
  resources: Resource[],
  initial: BookingContext = {},
): BookingFlowState => {
  // STATE
  const branches: BookingBranch[] = (
    business.branches?.length
      ? business.branches
      : [business.main_branch ?? business.mainBranch].filter(
          (branch): branch is BookingBranch => !!branch,
        )
  ).filter((branch) => branch.is_active !== false);
  const [initialState] = useState(() =>
    resolveBookingContext(
      business,
      services,
      professionals,
      resources,
      branches,
      initial,
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(
        new Date(),
      ),
    ),
  );
  const [selection, setSelection] = useState<BookingSelection>(
    initialState.selection,
  );
  const service =
    services.find((item) => item.id === selection.serviceId) ?? null;
  const model = bookingModel(service, business);
  const requiresProfessional = hasProfessionalChoice(service, business);
  const requiresResource = model === 'resource' || (!service?.booking_model && business.uses_resources === true);
  const durations = bookingDurations(service);
  const [requestedStep, setStep] = useState<BookingStep>(initialState.step);

  // DERIVED STATE
  const eligible = (
    service?.professionals ??
    professionals.filter(
      (professional) =>
        !professional.services ||
        professional.services.some((entry) => entry.id === service?.id),
    )
  ).filter(
    (professional) =>
      professional.is_active !== false &&
      (!professional.branch_ids?.length ||
        professional.branch_ids.includes(selection.branchId ?? -1)),
  );
  const professional =
    eligible.find((item) => item.id === selection.professionalId) ?? null;
  const eligibleResources = resources.filter(
    (resource) =>
      resource.is_active !== false && resource.branch_id === selection.branchId &&
      (model === 'resource' ? service?.resources?.some(entry => entry.id === resource.id) === true : !service?.resources?.length || service.resources.some(entry => entry.id === resource.id)),
  );
  const resource =
    eligibleResources.find((item) => item.id === selection.resourceId) ?? null;
  const branch =
    branches.find((item) => item.id === selection.branchId) ?? null;
  const steps: BookingStep[] = [
    "service",
    ...(requiresProfessional
      ? ["professional" as const]
      : []),
    "datetime",
    "review",
  ];
  const step = steps.includes(requestedStep) ? requestedStep : "service";
  const request =
    service && branch && selection.date
      ? {
          business_id: business.id,
          branch_id: branch.id,
          service_id: service.id,
          date: selection.date,
          duration_minutes: service.duration_mode === 'selectable' ? selection.durationMinutes : undefined,
          participants: selection.participants,
          ...(requiresProfessional && professional
            ? { professional_id: professional.id }
            : {}),
          ...(resource ? { resource_id: resource.id } : {}),
        }
      : null;
  const { availability, actions: availabilityActions } =
    useBookingAvailability(request);
  const selectedSlot =
    availability.slots.find(
      (slot) =>
        slot.available && slot.start_time.slice(0, 5) === selection.time &&
        (!selection.resourceId || slot.resource_id === selection.resourceId),
    ) ?? null;
  const canContinue =
    step === "service"
      ? !!service && !!branch
      : step === "professional"
        ? model !== 'professional' || eligible.length > 0
        : step === "datetime"
          ? !!selectedSlot && !availability.loading
          : false;
  const index = steps.indexOf(step);

  // ACTIONS
  const change = (updates: Partial<BookingSelection>, next?: BookingStep) => {
    setSelection((current) => ({ ...current, time: "", ...updates }));
    if (next) setStep(next);
  };
  const actions = {
    service: (id: number) => {
      const candidate = services.find((entry) => entry.id === id);
      const compatible =
        candidate?.professionals ??
        professionals.filter(
          (entry) =>
            !entry.services || entry.services.some((item) => item.id === id),
        );
      change({
        serviceId: id,
        professionalId: compatible.some(
          (entry) => entry.id === selection.professionalId,
        )
          ? selection.professionalId
          : null,
        resourceId: null,
        durationMinutes: bookingDurations(candidate)[0],
        participants: 1,
      });
    },
    professional: (id: number | null) => change({ professionalId: id }),
    resource: (id: number | null) => change({ resourceId: id }),
    branch: (id: number) => change({ branchId: id, resourceId: null, professionalId: null }),
    date: (date: string) => change({ date }),
    time: (time: string, resourceId?: number | null) => setSelection((current) => ({ ...current, time, ...(resourceId != null ? { resourceId } : {}) })),
    duration: (minutes: number) => { if (durations.includes(minutes)) change({ durationMinutes: minutes }); },
    participants: (count: number) => change({ participants: Math.max(1, Math.min(service?.booking_capacity ?? 1, Math.floor(count))) }),
    reloadAvailability: availabilityActions.reload,
    next: () => {
      if (canContinue && index < steps.length - 1) setStep(steps[index + 1]);
    },
    back: () => {
      if (index > 0) setStep(steps[index - 1]);
    },
    step: (target: BookingStep) => {
      if (steps.indexOf(target) <= index) setStep(target);
    },
  };

  return {
    selection,
    availability,
    notice: initialState.notice,
    journey: {
      step,
      steps,
      index,
      model,
      durations,
      service,
      professional,
      resource,
      branch,
      professionals: eligible,
      resources: eligibleResources,
      requiresProfessional,
      requiresResource,
      canContinue,
      selectedSlot,
      request,
    },
    actions,
  };
};
