/**
 * ElegantBarb Date Utilities
 * Formatea fechas de forma amigable para usuarios en español
 */

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

const DAYS = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
]

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr || typeof dateStr !== 'string') return ''
  // Strip time component if present (e.g. "2026-04-26T00:00:00.000000Z" -> "2026-04-26")
  const cleanDate = dateStr.split('T')[0].split(' ')[0]
  const d = new Date(cleanDate + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (d.getTime() === today.getTime()) return 'Hoy'
  if (d.getTime() === tomorrow.getTime()) return 'Mañana'

  const dayName = DAYS[d.getDay()]
  const day = d.getDate()
  const month = MONTHS[d.getMonth()]
  const year = d.getFullYear()
  const currentYear = today.getFullYear()

  return year === currentYear
    ? `${dayName}, ${day} de ${month}`
    : `${dayName}, ${day} de ${month} de ${year}`
}

export function formatTime(timeStr: string | undefined | null): string {
  if (!timeStr || typeof timeStr !== 'string') return ''
  const [hStr, mStr] = timeStr.split(':')
  const h = parseInt(hStr || '0', 10)
  const m = parseInt(mStr || '0', 10)
  if (isNaN(h) || isNaN(m)) return timeStr
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function formatDateTime(dateStr: string, timeStr: string): string {
  return `${formatDate(dateStr)} · ${formatTime(timeStr)}`
}

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return '$0'
  return `$${Number(value).toLocaleString('es-CO')}`
}

export function formatRelative(dateStr: string | undefined | null): string {
  if (!dateStr || typeof dateStr !== 'string') return ''
  const cleanDate = dateStr.split('T')[0].split(' ')[0]
  const d = new Date(cleanDate + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === 2) return 'Pasado mañana'
  if (diff < 0) return `Hace ${Math.abs(diff)} días`
  return `En ${diff} días`
}

export function generateCalendarDays(month: number, year: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: { day: number; current: boolean; date?: string }[] = []

  const prevDays = firstDay === 0 ? 6 : firstDay - 1
  for (let i = prevDays - 1; i >= 0; i--) {
    days.push({ day: new Date(year, month, -i).getDate(), current: false })
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, current: true, date: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` })
  }

  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, current: false })
  }

  return days
}
