import { STRENGTH_CATEGORIES, normalizeCategory } from './routineCategories'

// Orden de preferencia para "rellenar" el día siguiente a Natación cuando Piernas no es una
// opción válida (o cuando sí lo es pero hay algo mejor disponible en la cola).
const POST_SWIM_PREFERENCE = ['Tirón', 'Empuje', 'Descanso activo', 'Full Body', 'Cardio', 'Otro', 'Piernas']

function buildQueue(routines) {
  const counts = new Map()
  for (const routine of routines) {
    counts.set(routine.category, (counts.get(routine.category) ?? 0) + 1)
  }
  // Estable: mayor cantidad de repeticiones de su categoría primero (necesitan más espaciado).
  return [...routines].sort((a, b) => counts.get(b.category) - counts.get(a.category))
}

function categoryAt(assignments, routinesById, dayIndex) {
  if (dayIndex < 0 || dayIndex > 6) return null
  const routineId = assignments[String(dayIndex)]
  if (!routineId) return null
  return routinesById.get(routineId)?.category ?? null
}

function violatesRuleA(candidate, assignments, routinesById, dayIndex) {
  if (!STRENGTH_CATEGORIES.includes(candidate.category)) return false
  const prev = categoryAt(assignments, routinesById, dayIndex - 1)
  const next = categoryAt(assignments, routinesById, dayIndex + 1)
  return candidate.category === prev || candidate.category === next
}

function violatesRuleB(candidate, assignments, routinesById, dayIndex) {
  if (candidate.category !== 'Piernas') return false
  const prev = categoryAt(assignments, routinesById, dayIndex - 1)
  return prev === 'Natación'
}

/**
 * Sugiere una asignación día→rutina para las 7 filas del plan semanal, evitando repetir
 * categorías "de fuerza" en días consecutivos y evitando Piernas justo después de Natación.
 * Heurística greedy de una sola pasada (sin backtracking real): relaja las reglas cuando no
 * hay alternativa y documenta cada relajación en `notes`.
 *
 * @param {Array<{id: string, name: string, category?: string}>} routines
 * @param {{ fixed?: Record<string, string> }} [options]
 * @returns {{ assignments: Record<string, string|null>, notes: Array<{dayIndex: number|null, level: 'info'|'warning', message: string}> }}
 */
export function suggestWeeklyPlan(routines, { fixed = {} } = {}) {
  const notes = []
  const routinesById = new Map(routines.map((r) => [r.id, { ...r, category: normalizeCategory(r.category) }]))

  const assignments = {}
  const fixedIds = new Set()
  for (let i = 0; i < 7; i++) {
    const key = String(i)
    if (Object.prototype.hasOwnProperty.call(fixed, key)) {
      assignments[key] = fixed[key]
      if (fixed[key]) fixedIds.add(fixed[key])
    } else {
      assignments[key] = undefined
    }
  }

  const pool = routines.filter((r) => !fixedIds.has(r.id)).map((r) => routinesById.get(r.id))
  let queue = buildQueue(pool)

  const freeDays = []
  for (let i = 0; i < 7; i++) {
    if (assignments[String(i)] === undefined) freeDays.push(i)
  }

  for (const dayIndex of freeDays) {
    if (queue.length === 0) {
      assignments[String(dayIndex)] = null
      continue
    }

    let pickIndex = queue.findIndex(
      (c) => !violatesRuleA(c, assignments, routinesById, dayIndex) && !violatesRuleB(c, assignments, routinesById, dayIndex),
    )
    let relaxed = null

    if (pickIndex === -1) {
      // Relajar Regla A primero: preferir, entre las que violan A, alguna que no viole B.
      pickIndex = queue.findIndex((c) => !violatesRuleB(c, assignments, routinesById, dayIndex))
      relaxed = 'A'
    }
    if (pickIndex === -1) {
      // Ninguna evita B tampoco: aplicar orden de preferencia post-natación sobre lo que quede.
      const prevCategory = categoryAt(assignments, routinesById, dayIndex - 1)
      if (prevCategory === 'Natación') {
        const preference = [...queue].sort(
          (a, b) => POST_SWIM_PREFERENCE.indexOf(a.category) - POST_SWIM_PREFERENCE.indexOf(b.category),
        )
        pickIndex = queue.indexOf(preference[0])
      } else {
        pickIndex = 0
      }
      relaxed = 'B'
    }

    const chosen = queue[pickIndex]
    queue.splice(pickIndex, 1)
    assignments[String(dayIndex)] = chosen.id

    if (relaxed === 'A') {
      notes.push({
        dayIndex,
        level: 'warning',
        message: `${chosen.category} se repite en días consecutivos: no había suficientes rutinas para espaciarlas.`,
      })
    } else if (relaxed === 'B') {
      notes.push({
        dayIndex,
        level: 'warning',
        message: 'Se asignó Piernas justo después de Natación; considera cambiarlo manualmente.',
      })
    }
  }

  const restDays = Object.values(assignments).filter((v) => v === null).length
  if (restDays > 0 && pool.length < freeDays.length) {
    notes.push({
      dayIndex: null,
      level: 'info',
      message: 'No hay suficientes rutinas para cubrir todos los días; se dejó descanso.',
    })
  }
  if (queue.length > 0) {
    const names = queue.map((r) => r.name).join(', ')
    notes.push({
      dayIndex: null,
      level: 'info',
      message: `Sobraron rutinas para esta semana (quedan disponibles en Banca): ${names}.`,
    })
  }

  return { assignments, notes }
}
