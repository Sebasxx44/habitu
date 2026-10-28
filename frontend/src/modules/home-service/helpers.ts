import type {
  OnDemandRequest,
  OnDemandStatus,
} from "@/services/ondemand/ondemandService";
import type {
  HomeServiceErrors,
  HomeServiceForm,
  HomeServicePoint,
  HomeServiceStep,
} from "@/modules/home-service/types";

// CONSTANTS
export const HOME_SERVICE_CATEGORIES = [
  { value: "haircut", label: "Corte de cabello", symbol: "✂" },
  { value: "beard", label: "Barba y afeitado", symbol: "◒" },
  { value: "haircut_beard", label: "Corte y barba", symbol: "✦" },
  { value: "treatment", label: "Tratamiento", symbol: "✧" },
  { value: "color", label: "Coloración", symbol: "◐" },
  { value: "other", label: "Otro servicio", symbol: "+" },
] as const;
export const HOME_SERVICE_STATUS: Record<OnDemandStatus, string> = {
  SEARCHING: "Buscando profesional",
  ACCEPTED: "Profesional asignado",
  ON_THE_WAY: "En camino",
  IN_PROGRESS: "En servicio",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};
export const HOME_SERVICE_NEXT_STATUS: Partial<
  Record<OnDemandStatus, OnDemandStatus>
> = {
  ACCEPTED: "ON_THE_WAY",
  ON_THE_WAY: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
};

// HELPERS
export const isValidHomeServicePoint = (point: HomeServicePoint) =>
  Number.isFinite(point.lat) &&
  Number.isFinite(point.lng) &&
  Math.abs(point.lat) <= 90 &&
  Math.abs(point.lng) <= 180;
export const homeServicePoint = (
  lat?: string | number | null,
  lng?: string | number | null,
): HomeServicePoint | null => {
  if (lat == null || lng == null || lat === "" || lng === "") return null;
  const point = { lat: Number(lat), lng: Number(lng) };
  return isValidHomeServicePoint(point) ? point : null;
};
export const isHomeServiceActive = (request: OnDemandRequest) =>
  !["COMPLETED", "CANCELLED"].includes(request.status);
export const isHomeServiceExpired = (
  request: OnDemandRequest,
  now = Date.now(),
) =>
  request.status === "SEARCHING" &&
  !!request.search_expires_at &&
  new Date(request.search_expires_at).getTime() <= now;
export const canCancelHomeService = (request: OnDemandRequest) =>
  ["SEARCHING", "ACCEPTED", "ON_THE_WAY"].includes(request.status);
export const homeServiceAmount = (value?: string | number | null) =>
  value == null || value === "" || !Number.isFinite(Number(value))
    ? null
    : Number(value);
export const formatHomeServicePrice = (
  value?: string | number | null,
  currency = "COP",
) => {
  const amount = homeServiceAmount(value);
  return amount === null
    ? "Por confirmar"
    : new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: /^[A-Z]{3}$/.test(currency) ? currency : "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
};
export const formatHomeServiceDate = (value?: string | null) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return "Sin registro";
  return new Date(value).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};
export const homeServiceDescription = (form: HomeServiceForm) => {
  const category =
    HOME_SERVICE_CATEGORIES.find((item) => item.value === form.category)
      ?.label ?? form.category;
  return `${category}: ${form.description.trim()}${form.instructions.trim() ? `\nIndicaciones de acceso: ${form.instructions.trim()}` : ""}`;
};
export const validateHomeService = (
  form: HomeServiceForm,
  point: HomeServicePoint | null,
): HomeServiceErrors => {
  const errors: HomeServiceErrors = {};
  if (!HOME_SERVICE_CATEGORIES.some((item) => item.value === form.category))
    errors.category = "Elige el servicio que necesitas.";
  if (form.description.trim().length < 10)
    errors.description = "Describe lo que necesitas en al menos 10 caracteres.";
  if (form.description.length > 1400)
    errors.description = "Usa hasta 1.400 caracteres.";
  if (form.instructions.length > 350)
    errors.instructions = "Usa hasta 350 caracteres para las indicaciones.";
  if (form.address.trim().length < 5 || form.address.length > 500)
    errors.address = "Escribe una dirección completa, de 5 a 500 caracteres.";
  if (!point || !isValidHomeServicePoint(point))
    errors.location =
      "Usa tu ubicación o selecciona el punto de atención en el mapa.";
  return errors;
};
export const homeServiceSteps = (
  request: OnDemandRequest,
): HomeServiceStep[] => [
  {
    status: "SEARCHING",
    label: "Solicitud enviada",
    description: "Buscamos disponibilidad cerca de tu ubicación.",
    date: request.created_at,
  },
  {
    status: "ACCEPTED",
    label: "Profesional asignado",
    description: "Revisa quién te atenderá y los detalles del servicio.",
    date: request.accepted_at,
  },
  {
    status: "ON_THE_WAY",
    label: "En camino",
    description: "Prepara el acceso a tu dirección.",
  },
  {
    status: "IN_PROGRESS",
    label: "Servicio en curso",
    description: "Tu profesional está realizando la atención.",
    date: request.started_at,
  },
  {
    status: "COMPLETED",
    label: "Servicio completado",
    description: "Consulta el resumen de tu atención.",
    date: request.completed_at,
  },
];
export const homeServiceDistance = (
  from: HomeServicePoint,
  to: HomeServicePoint,
) => {
  const radians = (value: number) => (value * Math.PI) / 180;
  const a =
    Math.sin(radians(to.lat - from.lat) / 2) ** 2 +
    Math.cos(radians(from.lat)) *
      Math.cos(radians(to.lat)) *
      Math.sin(radians(to.lng - from.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
};
