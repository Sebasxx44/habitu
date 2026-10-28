import {
  Building2,
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ButtonTA } from "@/components/TA/ButtonTA";
import type { ManagedBranch } from "@/modules/branches/types";

// COMPONENT
export const BranchCardTA = ({
  branch,
  currency,
  onEdit,
  onRemove,
}: {
  branch: ManagedBranch;
  currency: string;
  onEdit: (branch: ManagedBranch) => void;
  onRemove: (branch: ManagedBranch) => void;
}) => {
  const money = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  const cancellationRate = branch.metrics.appointments
    ? Math.round(
        ((branch.metrics.cancelled + branch.metrics.noShow) /
          branch.metrics.appointments) *
          100,
      )
    : 0;
  const openDays = branch.schedules.filter((day) => !day.is_closed).length;
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">{branch.name}</h2>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
              <span
                className={
                  branch.is_active
                    ? "font-medium text-emerald-700 dark:text-emerald-300"
                    : "text-muted-foreground"
                }
              >
                {branch.is_active ? "● Activa" : "○ Inactiva"}
              </span>
              {branch.is_main_branch && (
                <span className="rounded-full border border-border px-2">
                  Principal
                </span>
              )}
            </div>
          </div>
        </div>
        <ButtonTA
          variant="ghost"
          size="icon"
          aria-label={`Editar ${branch.name}`}
          onClick={() => onEdit(branch)}
        >
          <Pencil className="size-4" />
        </ButtonTA>
      </div>
      <div className="space-y-2 px-5 text-xs text-muted-foreground">
        <p className="flex items-start gap-2">
          <MapPin className="size-4 shrink-0" />
          {branch.address}
        </p>
        <div className="flex flex-wrap gap-4">
          {branch.phone && (
            <a
              href={`tel:${branch.phone.replace(/[^+0-9]/g, "")}`}
              className="flex min-h-9 items-center gap-2 hover:text-primary"
            >
              <Phone className="size-3.5" />
              {branch.phone}
            </a>
          )}
          <span className="flex items-center gap-2">
            <Clock className="size-3.5" />
            {openDays ? `${openDays} días abiertos` : "Sin días abiertos"}
          </span>
        </div>
      </div>
      <dl className="mx-5 mt-4 grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl bg-secondary/35 p-4">
        <div>
          <dt className="text-[11px] text-muted-foreground">
            Valor realizado · {currency}
          </dt>
          <dd className="mt-1 text-lg font-bold tabular-nums">
            {money(branch.metrics.revenue)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">
            Clientes atendidos
          </dt>
          <dd className="mt-1 text-lg font-bold tabular-nums">
            {branch.metrics.clients}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">
            Citas completadas
          </dt>
          <dd className="mt-1 text-sm font-semibold">
            {branch.metrics.completed}{" "}
            <span className="font-normal text-muted-foreground">
              de {branch.metrics.appointments}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">
            Ticket promedio · {currency}
          </dt>
          <dd className="mt-1 text-sm font-semibold">
            {branch.metrics.averageTicket === null
              ? "Sin servicios completados"
              : money(branch.metrics.averageTicket)}
          </dd>
        </div>
      </dl>
      <p className="mx-5 mt-4 flex-1 text-xs leading-relaxed text-muted-foreground">
        {!openDays
          ? "Configura el horario para habilitar disponibilidad en esta sede."
          : !branch.services_count
            ? "Asigna servicios a esta sede desde el catálogo para recibir reservas."
            : cancellationRate >= 15
              ? `${cancellationRate}% de las reservas terminaron en cancelación o ausencia. Revisa confirmaciones y ofrece reprogramación.`
              : branch.metrics.appointments === 0
                ? "Comparte la ubicación y revisa el catálogo para impulsar las primeras reservas."
                : `${branch.metrics.upcoming} citas por atender. Revisa el equipo asignado y prepara los próximos servicios.`}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border p-4">
        <Link
          to={`/admin/appointments?branch_id=${branch.id}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary/10"
        >
          <CalendarDays className="size-4" />
          Ver agenda
        </Link>
        <div className="flex gap-1">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.lat != null && branch.lng != null ? `${branch.lat},${branch.lng}` : branch.address)}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Ver ${branch.name} en mapa`}
            className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-secondary"
          >
            <ExternalLink className="size-4" />
          </a>
          <ButtonTA
            variant="ghost"
            size="icon"
            aria-label={`Eliminar ${branch.name}`}
            disabled={!!branch.is_main_branch}
            onClick={() => onRemove(branch)}
            className="text-destructive"
          >
            <Trash2 className="size-4" />
          </ButtonTA>
        </div>
      </div>
    </article>
  );
};
