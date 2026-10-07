// Ayudas para trabajar con fechas de <input type="date"> sin el corrimiento de un día que
// causa parsear/formatear con UTC en vez de la zona horaria local (ej. "2026-08-14" en
// `new Date(...)` se interpreta como medianoche UTC, que en Costa Rica -UTC-6- cae la tarde
// del 13). Todo el código de Ahorros debe usar estas funciones en vez de Date/ISOString directo.

function pad(n) {
  return String(n).padStart(2, '0')
}

/** Valor de hoy en formato "YYYY-MM-DD" según la fecha LOCAL del dispositivo. */
export function todayInputValue() {
  return toDateInputValue(new Date())
}

/** Convierte el string "YYYY-MM-DD" de un <input type="date"> a un Date a medianoche LOCAL. */
export function parseDateInput(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Convierte un Date/Timestamp de Firestore al string "YYYY-MM-DD" en hora LOCAL. */
export function toDateInputValue(value) {
  const d = value?.toDate
    ? value.toDate()
    : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? parseDateInput(value)
      : new Date(value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Formatea un Date/Timestamp de Firestore para mostrar (ej. "14/8/2026"). */
export function formatDate(value) {
  const d = value?.toDate ? value.toDate() : new Date(value)
  return d.toLocaleDateString('es-CR')
}

/** Devuelve la clave local YYYY-MM para agrupar fechas por mes. */
export function monthKey(value) {
  return toDateInputValue(value).slice(0, 7)
}

/** Devuelve un nombre de mes legible para los selectores del historial. */
export function formatMonth(value) {
  const [year, month] = monthKey(value).split('-').map(Number)
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-CR', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Agrupa movimientos por mes, conservando el orden recibido dentro de cada grupo. */
export function groupMovementsByMonth(movements) {
  const groups = new Map()

  for (const movement of movements) {
    const key = monthKey(movement.date)
    if (!groups.has(key)) {
      groups.set(key, { key, label: formatMonth(movement.date), movements: [] })
    }
    groups.get(key).movements.push(movement)
  }

  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key))
}
