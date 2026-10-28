import {
  analyticsToday,
  validAnalyticsRange,
} from "@/modules/analytics/period";
import type {
  DateRangePreset,
  DateRangeValue,
} from "@/modules/analytics/dateRangeTypes";

// HELPERS
export const rangeForPreset = (
  preset: Exclude<DateRangePreset, "custom">,
  end = analyticsToday(),
): DateRangeValue => {
  const start = new Date(`${end}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - Number(preset) + 1);
  return { preset, start: start.toISOString().slice(0, 10), end };
};

export const initialDateRange = (
  preset: Exclude<DateRangePreset, "custom"> = "30",
): DateRangeValue => rangeForPreset(preset);

export const sameDateRange = (
  left: DateRangeValue,
  right: DateRangeValue,
): boolean =>
  left.preset === right.preset &&
  left.start === right.start &&
  left.end === right.end;

export const dateRangeParams = (
  range: DateRangeValue,
): Record<string, string> =>
  range.preset === "custom"
    ? { start_date: range.start, end_date: range.end }
    : { days: range.preset };

export const validDateRange = (
  range: DateRangeValue,
  maximum = analyticsToday(),
): boolean => validAnalyticsRange(range.start, range.end, maximum);
