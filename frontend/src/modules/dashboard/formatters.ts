import i18n from '@/i18n'
import { currentLocale, formatCurrency, formatDate } from '@/i18n/formatters'
import type { DashboardMetric } from "@/modules/dashboard/types";

// FORMATTERS
export const formatMoney = (value: number, currency = "COP"): string =>
  formatCurrency(value, currency);

export const formatMetric = (
  metric: DashboardMetric,
  currency: string,
): string => {
  if (metric.unit === "currency") return formatMoney(metric.value, currency);
  if (metric.unit === "percent")
    return `${new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 1 }).format(metric.value)}%`;
  return new Intl.NumberFormat(currentLocale()).format(metric.value);
};

export const formatDay = (date: string, long = false): string =>
  formatDate(date.slice(0, 10), {
    day: "numeric",
    month: long ? "long" : "short",
    year: long ? "numeric" : undefined,
  });

const statusAliases: Record<string, string> = { PENDIENTE: 'PENDING', CONFIRMADA: 'CONFIRMED', COMPLETADA: 'COMPLETED', CANCELADA: 'CANCELLED', NO_ASISTIO: 'NO_SHOW' }
export const statusLabel = (status: string): string => i18n.t(`bookingStatus.${statusAliases[status] ?? status}`, { defaultValue: status })

// Compatibility for existing consumers; getters follow the current language.
export const statusLabels: Record<string, string> = {}
for (const status of ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED', ...Object.keys(statusAliases)]) {
  Object.defineProperty(statusLabels, status, { enumerable: true, get: () => statusLabel(status) })
}
