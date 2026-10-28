import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuth } from "@/App";
import { useBookingAvailability } from "@/composables/useBookingAvailability";
import { businessService } from "@/services/business/businessService";
import { bookingAvailabilityService } from "@/services/booking/availabilityService";
import { calendarDirectory } from "@/modules/calendar/calendarApi";
import {
  calendarToday,
  validCalendarDate,
} from "@/modules/calendar/calendarModel";
import type {
  CalendarBookingForm,
  CalendarBookingState,
} from "@/modules/calendar/types";
import type {
  BookingApiError,
  BookingRequest,
  BookingSlot,
} from "@/composables/booking/types";
import type {
  Branch,
  Client,
  Professional,
  Resource,
  Service,
} from "@/types/models";

// HELPERS
export const calendarSlotKey = (slot: BookingSlot): string =>
  `${slot.start_time}|${slot.professional_id || ""}|${slot.resource_id || ""}`;

// COMPOSABLE
export const useCalendarBooking = (): CalendarBookingState => {
  // STATE
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [values, setValues] = useState<CalendarBookingForm>({
    clientId: params.get("client_id") || "",
    serviceId: params.get("service_id") || "",
    professionalId: params.get("professional_id") || "",
    branchId: params.get("branch_id") || "",
    resourceId: "",
    date: validCalendarDate(params.get("date") || "")
      ? params.get("date")!
      : calendarToday(),
    slotKey: "",
    duration: "",
    participants: "1",
    notes: "",
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const idempotency = useRef<{ signature: string; key: string } | null>(null);
  const service = services.find((item) => String(item.id) === values.serviceId);
  const model =
    service?.booking_model ||
    (service?.requires_professional === false ? "direct" : "professional");
  const supportsProfessional =
    model === "professional" ||
    model === "optional_professional" ||
    (model === "resource" && service?.resource_professional_optional === true);
  const request: BookingRequest | null =
    user?.barber_shop_id &&
    values.branchId &&
    service &&
    validCalendarDate(values.date)
      ? {
          business_id: user.barber_shop_id,
          branch_id: Number(values.branchId),
          service_id: service.id,
          professional_id:
            supportsProfessional && values.professionalId
              ? Number(values.professionalId)
              : undefined,
          resource_id:
            model === "resource" && values.resourceId
              ? Number(values.resourceId)
              : undefined,
          date: values.date,
          duration_minutes:
            Number(values.duration) ||
            service.duration_minutes ||
            service.duration,
          participants:
            model === "capacity" ? Number(values.participants) || 1 : 1,
        }
      : null;
  const { availability, actions } = useBookingAvailability(request);
  const slots = availability.slots.filter((slot) => slot.available);
  const selected =
    slots.find((slot) => calendarSlotKey(slot) === values.slotKey) || null;

  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setLoadError("");
      if (!user?.barber_shop_id) {
        setLoadError("No tienes un negocio asignado.");
        setLoading(false);
        return;
      }
      try {
        const businessId = user.barber_shop_id;
        const [clientList, serviceList, staff, business, resourceList] =
          await Promise.all([
            calendarDirectory<Client>(
              "/v2/clients",
              businessId,
              controller.signal,
            ),
            calendarDirectory<Service>(
              "/v2/services",
              businessId,
              controller.signal,
            ),
            calendarDirectory<Professional>(
              "/v2/professionals",
              businessId,
              controller.signal,
            ),
            businessService.getById(businessId),
            calendarDirectory<Resource>(
              "/v2/resources",
              businessId,
              controller.signal,
            ),
          ]);
        if (controller.signal.aborted) return;
        setClients(clientList);
        setServices(serviceList.filter((item) => item.is_active !== false));
        setProfessionals(staff.filter((person) => person.is_active !== false));
        setResources(resourceList.filter((item) => item.is_active !== false));
        setBranches(
          (business.branches || []).filter(
            (branch) => branch.is_active !== false,
          ),
        );
        setValues((previous) => ({
          ...previous,
          branchId:
            previous.branchId ||
            String(
              business.main_branch?.id || business.branches?.[0]?.id || "",
            ),
        }));
      } catch {
        if (!controller.signal.aborted)
          setLoadError("No pudimos cargar los datos para la reserva.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [user?.barber_shop_id, revision]);

  // ACTIONS
  const set = (field: keyof CalendarBookingForm, value: string) => {
    setValues((previous) => ({
      ...previous,
      [field]: value,
      ...(!["slotKey", "notes", "clientId"].includes(field)
        ? { slotKey: "" }
        : {}),
      ...(field === "serviceId"
        ? {
            duration: "",
            resourceId: "",
            participants: "1",
            professionalId: "",
          }
        : {}),
      ...(field === "branchId" ? { resourceId: "" } : {}),
    }));
    setError("");
  };
  const submit = async () => {
    if (
      lock.current ||
      !request ||
      !selected ||
      availability.loading ||
      availability.error ||
      !clients.some((client) => String(client.id) === values.clientId)
    )
      return;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      const data = {
        ...request,
        client_id: Number(values.clientId),
        professional_id: selected.professional_id ?? request.professional_id,
        resource_id: selected.resource_id ?? request.resource_id,
        start_time: selected.start_time.slice(0, 5),
        notes: values.notes.trim(),
        source: "web" as const,
      };
      const signature = JSON.stringify(data);
      if (idempotency.current?.signature !== signature)
        idempotency.current = { signature, key: crypto.randomUUID() };
      const appointment = await bookingAvailabilityService.create({
        ...data,
        idempotency_key: idempotency.current.key,
      });
      navigate(`/admin/calendar/${appointment.id}?date=${values.date}`);
    } catch (failure) {
      const response = isAxiosError<BookingApiError>(failure)
        ? failure.response?.data
        : undefined;
      setError(
        Object.values(response?.errors || {}).flat()[0] ||
          response?.error ||
          response?.message ||
          "No se pudo crear la reserva. Revisa la disponibilidad e inténtalo de nuevo.",
      );
      actions.reload();
      setValues((previous) => ({ ...previous, slotKey: "" }));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  // RETURN
  return {
    form: { values, set },
    options: {
      clients,
      services,
      professionals,
      branches,
      resources: resources.filter(
        (item) =>
          String(item.branch_id) === values.branchId &&
          (!service?.resources?.length ||
            service.resources.some((resource) => resource.id === item.id)),
      ),
      loading,
      error: loadError,
      retry: () => setRevision((value) => value + 1),
    },
    schedule: {
      slots,
      selected,
      loading: availability.loading,
      error: availability.error,
      reload: actions.reload,
      service,
    },
    submission: { saving, error, submit },
  };
};
