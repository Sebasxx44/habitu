import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ProfessionalRecord } from "@/modules/professionals/types";

// CONSTANTS
export const professionalSelectClass =
  "min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
export const professionalCurrency = (
  value: number | string | null | undefined,
  currency = "COP",
): string =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
export const professionalDate = (value: string): string =>
  new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.split("T")[0]}T12:00:00`));
export const appointmentStatus = (value: string): string =>
  ({
    PENDING: "Pendiente",
    CONFIRMED: "Confirmada",
    COMPLETED: "Completada",
    CANCELLED: "Cancelada",
    NO_SHOW: "No asistió",
    IN_PROGRESS: "En curso",
    PENDIENTE: "Pendiente",
    CONFIRMADA: "Confirmada",
    COMPLETADA: "Completada",
    CANCELADA: "Cancelada",
    NO_ASISTIO: "No asistió",
  })[value] ?? value;

// COMPONENTS
export const ProfessionalAvatarTA = ({
  name,
  photo,
  large = false,
}: {
  name: string;
  photo?: string;
  large?: boolean;
}) => (
  <div
    className={cn(
      "relative shrink-0 overflow-hidden rounded-2xl bg-primary/10 text-primary",
      large ? "size-24 text-3xl" : "size-12 text-lg",
    )}
  >
    <span
      className="absolute inset-0 grid place-items-center font-semibold"
      aria-hidden="true"
    >
      {name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("") || "P"}
    </span>
    {photo && (
      <img
        key={photo}
        src={photo}
        alt={name}
        className="relative size-full object-cover"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    )}
  </div>
);
export const ProfessionalStatusTA = ({ active }: { active?: boolean }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
      active
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        : "bg-muted text-muted-foreground",
    )}
  >
    <span
      className={cn(
        "size-1.5 rounded-full",
        active ? "bg-emerald-500" : "bg-muted-foreground",
      )}
    />
    {active ? "Activo" : "Inactivo"}
  </span>
);
export const ProfessionalMetricTA = ({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: ReactNode;
  caption: string;
  icon: ReactNode;
}) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <span className="text-primary [&>svg]:size-4" aria-hidden="true">
        {icon}
      </span>
    </div>
    <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
  </div>
);
export const ProfessionalContactTA = ({
  professional,
}: {
  professional: ProfessionalRecord;
}) => (
  <div className="space-y-2 text-sm">
    {professional.email ? (
      <a
        className="block truncate text-muted-foreground hover:text-primary hover:underline"
        href={`mailto:${professional.email}`}
      >
        {professional.email}
      </a>
    ) : (
      <p className="text-muted-foreground">Sin correo registrado</p>
    )}
    {professional.phone ? (
      <a
        className="block text-muted-foreground hover:text-primary hover:underline"
        href={`tel:${professional.phone}`}
      >
        {professional.phone}
      </a>
    ) : (
      <p className="text-muted-foreground">Sin teléfono registrado</p>
    )}
  </div>
);
