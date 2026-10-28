import type { OnDemandRequest } from "@/services/ondemand/ondemandService";
import {
  HOME_SERVICE_STATUS,
  homeServiceAmount,
  isHomeServiceActive,
  isHomeServiceExpired,
} from "@/modules/home-service/helpers";

// TYPES
export interface HomeServiceMetrics {
  active: number;
  completed: number;
  expired: number;
  completionRate: number | null;
  averageAcceptanceMinutes: number | null;
  finalRevenue: { currency: string; amount: number }[];
  statuses: { status: string; label: string; count: number }[];
  daily: { date: string; label: string; created: number; completed: number }[];
}

// HELPERS
const businessDate = (value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
const dateKey = (value: string) =>
  Number.isNaN(new Date(value).getTime())
    ? null
    : businessDate(new Date(value));

export const homeServiceMetrics = (
  requests: OnDemandRequest[],
  now = new Date(),
): HomeServiceMetrics => {
  const completed = requests.filter(
    (request) => request.status === "COMPLETED",
  );
  const cancelled = requests.filter(
    (request) => request.status === "CANCELLED",
  );
  const acceptanceMinutes = requests.flatMap((request) => {
    if (!request.accepted_at) return [];
    const minutes =
      (new Date(request.accepted_at).getTime() -
        new Date(request.created_at).getTime()) /
      60000;
    return Number.isFinite(minutes) && minutes >= 0 ? [minutes] : [];
  });
  const finalRevenue = new Map<string, number>();
  completed.forEach((request) => {
    const amount = homeServiceAmount(request.final_price);
    if (amount === null) return;
    const currency = request.currency || "COP";
    finalRevenue.set(currency, (finalRevenue.get(currency) ?? 0) + amount);
  });
  const today = businessDate(now);
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T12:00:00-05:00`);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const key = businessDate(date);
    return {
      date: key,
      label: date.toLocaleDateString("es-CO", {
        timeZone: "America/Bogota",
        day: "numeric",
        month: "short",
      }),
      created: requests.filter((request) => dateKey(request.created_at) === key)
        .length,
      completed: completed.filter(
        (request) =>
          request.completed_at && dateKey(request.completed_at) === key,
      ).length,
    };
  });
  return {
    active: requests.filter(isHomeServiceActive).length,
    completed: completed.length,
    expired: requests.filter((request) =>
      isHomeServiceExpired(request, now.getTime()),
    ).length,
    completionRate:
      completed.length + cancelled.length
        ? (completed.length / (completed.length + cancelled.length)) * 100
        : null,
    averageAcceptanceMinutes: acceptanceMinutes.length
      ? acceptanceMinutes.reduce((sum, value) => sum + value, 0) /
        acceptanceMinutes.length
      : null,
    finalRevenue: [...finalRevenue].map(([currency, amount]) => ({
      currency,
      amount,
    })),
    statuses: Object.entries(HOME_SERVICE_STATUS).map(([status, label]) => ({
      status,
      label,
      count: requests.filter((request) => request.status === status).length,
    })),
    daily,
  };
};
