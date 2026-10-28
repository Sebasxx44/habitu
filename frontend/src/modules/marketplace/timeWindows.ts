import { discoveryDay } from "@/modules/discovery/query";
import type { DiscoveryFilterChange } from "@/modules/discovery/searchTypes";

// TYPES
export type QuickMoment =
  "now" | "in30" | "in60" | "afternoon" | "evening" | "tomorrow" | "weekend";
export const quickMoments: QuickMoment[] = [
  "now",
  "in30",
  "in60",
  "afternoon",
  "evening",
  "tomorrow",
  "weekend",
];

// FILTERS
export const momentFilters = (
  moment: QuickMoment,
  clock = new Date(),
  timezone = "America/Bogota",
): DiscoveryFilterChange => {
  const day = (offset = 0) => discoveryDay(offset, clock, timezone);
  const today = day();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(clock);
  const current =
    Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 +
    Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const at = (minutes: number): string =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const filters: DiscoveryFilterChange = {
    available: "1",
    date: today,
    date_to: "",
    time_from: "",
    time_to: "",
    sort: "recommended",
  };
  if (moment === "tomorrow") return { ...filters, date: day(1) };
  if (moment === "weekend") {
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
    const offset = weekday === 0 || weekday === 6 ? 0 : 6 - weekday;
    return {
      ...filters,
      date: day(offset),
      date_to: day(offset + (weekday === 0 ? 0 : 1)),
    };
  }
  if (moment === "afternoon")
    return { ...filters, time_from: "12:00", time_to: "18:00" };
  if (moment === "evening")
    return { ...filters, time_from: "18:00", time_to: "23:59" };
  const start =
    Math.ceil(
      (current + (moment === "in30" ? 30 : moment === "in60" ? 60 : 0)) / 5,
    ) * 5;
  const localStart = start % 1440;
  return {
    ...filters,
    date: day(Math.floor(start / 1440)),
    time_from: at(localStart),
    time_to: at(Math.min(1439, localStart + 120)),
  };
};
