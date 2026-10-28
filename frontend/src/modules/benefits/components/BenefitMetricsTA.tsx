import {
  ArrowDownToLine,
  BadgeCheck,
  CalendarCheck,
  Coins,
  Gift,
  TicketPercent,
  Users,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/i18n/formatters";
import type {
  AdminBenefitsData,
  BenefitAdminKind,
} from "@/modules/benefits/adminTypes";
import { benefitRecordStatus } from "@/modules/benefits/adminPresentation";

// COMPONENT
export const BenefitMetricsTA = ({
  data,
  kind,
}: {
  data: AdminBenefitsData;
  kind: BenefitAdminKind;
}) => {
  const analytics = data.analytics;
  const active = data[kind].filter(
    (item) => benefitRecordStatus(item) === "active",
  ).length;
  const number = (value: number | undefined): string =>
    value === undefined ? "—" : formatNumber(value);
  const metrics =
    kind === "promotions"
      ? [
          {
            label: "Promociones vigentes",
            value: formatNumber(active),
            icon: TicketPercent,
            note: "Disponibles para reservar",
          },
          {
            label: "Cupones utilizados",
            value: number(analytics?.promotions.redemptions),
            icon: BadgeCheck,
            note: "Reservas con descuento",
          },
          {
            label: "Clientes beneficiados",
            value: number(analytics?.promotions.unique_clients),
            icon: Users,
            note: "Clientes únicos",
          },
          {
            label: "Ahorro entregado",
            value: analytics
              ? formatCurrency(analytics.promotions.saved_amount)
              : "—",
            icon: Coins,
            note: "Descuentos registrados",
          },
        ]
      : kind === "plans"
        ? [
            {
              label: "Planes publicados",
              value: formatNumber(active),
              icon: BadgeCheck,
              note: "Disponibles en el catálogo",
            },
            {
              label: "Membresías activas",
              value: number(analytics?.memberships.active),
              icon: Users,
              note: "Beneficios vigentes",
            },
            {
              label: "Ingresos verificados",
              value: analytics
                ? formatCurrency(analytics.memberships.verified_revenue)
                : "—",
              icon: ArrowDownToLine,
              note: "Pagos confirmados",
            },
            {
              label: "Citas utilizadas",
              value: number(analytics?.memberships.used_appointments),
              icon: CalendarCheck,
              note: "Consumo de membresías",
            },
          ]
        : [
            {
              label: "Tarjetas de clientes",
              value: number(analytics?.loyalty.cards ?? data.cards.total),
              icon: Users,
              note: `${active} programas vigentes`,
            },
            {
              label: "Sellos acumulados",
              value: number(analytics?.loyalty.stamps),
              icon: BadgeCheck,
              note: "Visitas reconocidas",
            },
            {
              label: "Recompensas entregadas",
              value: number(analytics?.loyalty.rewards_delivered),
              icon: Gift,
              note: "Canjes completados",
            },
            {
              label: "Vales disponibles",
              value: number(analytics?.loyalty.available_vouchers),
              icon: TicketPercent,
              note: "Pendientes de entrega",
            },
          ];
  return (
    <section
      aria-label="Indicadores del módulo"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {metrics.map(({ label, value, icon: Icon, note }) => (
        <article
          className="stat-card min-w-0 rounded-2xl border border-primary/10 p-5"
          key={label}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <Icon className="size-4 shrink-0 text-primary" />
          </div>
          <p className="mt-4 break-words text-2xl font-bold tracking-tight">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </article>
      ))}
    </section>
  );
};
