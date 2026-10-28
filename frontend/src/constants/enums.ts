export const BARBER_SPECIALTIES = [
  'Degradados (Fades)',
  'Cuidado de Barba',
  'Corte Clásico a Tijera',
  'Colorimetría y Tintura',
  'Tratamientos Capilares',
  'Estilismo y Peinado',
  'Diseño y Hair Tattoo',
  'Barbería Tradicional'
] as const;

export type BarberSpecialty = typeof BARBER_SPECIALTIES[number];
