import i18n from "@/i18n";

// CONFIGURATION
export const BOOKING_TIMEZONE =
  import.meta.env?.VITE_BOOKING_TIMEZONE || "America/Bogota";
export const currentLocale = (): string =>
  i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";

// FORMATTERS
export const formatNumber = (
  value: number,
  options: Intl.NumberFormatOptions = {},
): string => new Intl.NumberFormat(currentLocale(), options).format(value);

export const formatCurrency = (value: number, currency = "COP"): string =>
  formatNumber(value, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: currency === "COP" && Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });

export const formatDate = (
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = {},
  timeZone = BOOKING_TIMEZONE,
): string => {
  // Calendar dates have no UTC offset: preserve their day across time zones.
  const dateOnly =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly ? new Date(`${value}T12:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const defaults: Intl.DateTimeFormatOptions =
    options.dateStyle || options.timeStyle
      ? {}
      : { year: "numeric", month: "short", day: "numeric" };
  return new Intl.DateTimeFormat(currentLocale(), {
    ...defaults,
    ...options,
    timeZone: dateOnly ? "UTC" : timeZone,
  }).format(date);
};

export const formatTime = (
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = {},
  timeZone = BOOKING_TIMEZONE,
): string => {
  const wallTime =
    typeof value === "string" && /^\d{2}:\d{2}(?::\d{2})?$/.test(value);
  const date = wallTime
    ? new Date(`2000-01-01T${value.length === 5 ? `${value}:00` : value}Z`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const defaults: Intl.DateTimeFormatOptions =
    options.dateStyle || options.timeStyle
      ? {}
      : { hour: "numeric", minute: "2-digit" };
  return new Intl.DateTimeFormat(currentLocale(), {
    ...defaults,
    ...options,
    timeZone: wallTime ? "UTC" : timeZone,
  }).format(date);
};
