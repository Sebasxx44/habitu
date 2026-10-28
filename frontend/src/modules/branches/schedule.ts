// CONSTANTS
const dayAliases: Record<string, number> = {
  DOM: 0,
  DOMINGO: 0,
  SUNDAY: 0,
  LUN: 1,
  LUNES: 1,
  MONDAY: 1,
  MAR: 2,
  MARTES: 2,
  TUESDAY: 2,
  MIE: 3,
  MIERCOLES: 3,
  WEDNESDAY: 3,
  JUE: 4,
  JUEVES: 4,
  THURSDAY: 4,
  VIE: 5,
  VIERNES: 5,
  FRIDAY: 5,
  SAB: 6,
  SABADO: 6,
  SATURDAY: 6,
};

// TRANSFORMERS
export const branchDayIndex = (value: string): number | null =>
  /^[0-6]$/.test(value)
    ? Number(value)
    : (dayAliases[
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase()
      ] ?? null);
