// ACTIONS
export const bookingDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const downloadBookingCalendar = (
  id: number,
  date: string,
  time: string,
  duration: number,
  title: string,
  timezone: string,
): void => {
  const safeTitle = title
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const start = `${date.replace(/-/g, "")}T${time.slice(0, 5).replace(":", "")}00`;
  const contents = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ElegantBarb//Agenda//ES",
    "BEGIN:VEVENT",
    `UID:appointment-${id}@elegantbarb`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${timezone}:${start}`,
    `DURATION:PT${Math.max(1, duration)}M`,
    `SUMMARY:${safeTitle}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([contents], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `cita-${id}.ics`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
