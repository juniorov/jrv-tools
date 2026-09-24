import { parseDateInput } from './dates'

/** IMC = peso(kg) / altura(m)^2, redondeado a 1 decimal. null si peso/altura inválidos. */
export function computeBmi(weightKg, heightCm) {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(heightCm) || heightCm <= 0) return null
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

/** Ordena mediciones cronológicamente ascendente por `date` ("YYYY-MM-DD"). */
export function sortByDate(entries) {
  return [...entries].sort((a, b) => parseDateInput(a.date) - parseDateInput(b.date))
}

/**
 * Serie {date, value} lista para un gráfico de línea, para una métrica dada (ej. 'weightKg',
 * 'bodyFatPercent', 'waistCm'), omitiendo entradas sin ese campo.
 */
export function metricSeries(entries, field) {
  return sortByDate(entries)
    .filter((entry) => Number.isFinite(entry[field]))
    .map((entry) => ({ date: entry.date, value: entry[field] }))
}

/** Última entrada cronológica, o null si no hay ninguna. */
export function latestEntry(entries) {
  if (entries.length === 0) return null
  return sortByDate(entries).at(-1)
}

/** Diferencia (última - primera) para un campo, o null si falta algún dato. */
export function deltaFromFirst(entries, field) {
  const sorted = sortByDate(entries).filter((entry) => Number.isFinite(entry[field]))
  if (sorted.length < 2) return null
  return Math.round((sorted.at(-1)[field] - sorted[0][field]) * 10) / 10
}
