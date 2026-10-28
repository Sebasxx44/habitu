import { BOOKING_TIMEZONE } from "@/i18n/formatters";
import type {
  AdminBenefitRecord,
  AdminBenefitStatus,
  BenefitAdminKind,
} from "@/modules/benefits/adminTypes";

// CONFIGURATION
export const benefitAdminModules = {
  promotions: {
    title: "Promociones y cupones",
    singular: "promoción",
    create: "Nueva promoción",
    path: "/admin/promotions",
    description:
      "Convierte una oferta en la próxima reserva. Controla códigos, vigencias, servicios y resultados.",
    section: "Catálogo de promociones",
  },
  plans: {
    title: "Membresías",
    singular: "membresía",
    create: "Nuevo plan",
    path: "/admin/memberships",
    description:
      "Diseña planes para volver, administra suscripciones y consulta los pagos y beneficios utilizados.",
    section: "Planes de membresía",
  },
  programs: {
    title: "Fidelidad",
    singular: "programa",
    create: "Nuevo programa",
    path: "/admin/loyalty",
    description:
      "Cada visita cuenta. Administra programas, tarjetas, sellos y la entrega de recompensas.",
    section: "Programas de fidelidad",
  },
} satisfies Record<
  BenefitAdminKind,
  {
    title: string;
    singular: string;
    create: string;
    path: string;
    description: string;
    section: string;
  }
>;
export const benefitStatusLabels: Record<AdminBenefitStatus, string> = {
  active: "Activo",
  paused: "Pausado",
  scheduled: "Programado",
  expired: "Vencido",
  exhausted: "Agotado",
};
export const membershipStatusLabels: Record<string, string> = {
  ACTIVE: "Activa",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
  SUSPENDED: "Pago en revisión",
  SCHEDULED: "Programada",
  APPROVED: "Aprobado",
  COMPLETED: "Completado",
  USED: "Utilizado",
  AVAILABLE: "Disponible",
  APPLIED: "Aplicado",
  REDEEMED: "Canjeado",
  RESTORED: "Restituido",
  EARN: "Acumulado",
  REDEEM: "Canjeado",
  DELIVERED: "Entregado",
  ADJUSTMENT: "Ajustado",
};

// HELPERS
export const benefitDateKey = (value: string | Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export const benefitToday = (): string => benefitDateKey(new Date());
export const benefitRecordStatus = (
  record: AdminBenefitRecord,
): AdminBenefitStatus => {
  if (!(record.active ?? record.is_active)) return "paused";
  const today = benefitToday();
  const end = (record.end_date ?? record.valid_until)?.slice(0, 10);
  if (end && end < today) return "expired";
  if (record.start_date && record.start_date.slice(0, 10) > today)
    return "scheduled";
  if (
    record.usage_limit !== null &&
    record.usage_limit !== undefined &&
    (record.usage_count ?? 0) >= record.usage_limit
  )
    return "exhausted";
  return "active";
};
export const benefitAdminPath = (
  kind: BenefitAdminKind,
  businessId: number | string,
  suffix = "",
): string =>
  `${benefitAdminModules[kind].path}${suffix}?business_id=${encodeURIComponent(businessId)}`;
