import { recipeMatchesGoal, recipeMatchesMealType } from './recipeTags'
import { MEAL_SLOTS } from './weeklyMenu'

function recipeAt(assignments, dayIndex, slotKey) {
  if (dayIndex < 0 || dayIndex > 6) return null
  return assignments[String(dayIndex)]?.[slotKey] ?? null
}

/**
 * Sugiere una asignación día×slot→recetaId para las 21 celdas de la semana (7 días x 3 comidas),
 * filtrando por `goal` (recetas que matchean ese objetivo o "Cualquiera"/sin objetivo) y por el
 * `mealType` de cada slot. Rota round-robin sobre el pool elegible de cada slot evitando repetir
 * la misma receta en días adyacentes del mismo slot cuando el pool lo permite; si no hay
 * alternativa, repite y deja una nota de advertencia. Pool vacío → null + nota informativa.
 *
 * @param {Array} recipes
 * @param {{ goal?: string, fixed?: Record<string, Record<string,string>> }} [options]
 * @returns {{ assignments: Record<string, Record<string,string|null>>, notes: Array<{dayIndex:number|null, slotKey:string|null, level:'info'|'warning', message:string}> }}
 */
export function suggestWeeklyMenu(recipes, { goal = 'Cualquiera', fixed = {} } = {}) {
  const notes = []
  const assignments = {}
  for (let i = 0; i < 7; i++) assignments[String(i)] = { ...(fixed[String(i)] || {}) }

  for (const slot of MEAL_SLOTS) {
    const pool = recipes.filter((r) => recipeMatchesMealType(r, slot.mealType) && recipeMatchesGoal(r, goal))

    if (pool.length === 0) {
      notes.push({
        dayIndex: null,
        slotKey: slot.key,
        level: 'info',
        message: `No hay recetas de ${slot.label} para el objetivo "${goal}".`,
      })
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        if (!Object.prototype.hasOwnProperty.call(assignments[String(dayIndex)], slot.key)) {
          assignments[String(dayIndex)][slot.key] = null
        }
      }
      continue
    }

    let cursor = 0
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      if (Object.prototype.hasOwnProperty.call(assignments[String(dayIndex)], slot.key)) continue

      const prevId = recipeAt(assignments, dayIndex - 1, slot.key)
      let pickIndex = -1
      for (let i = 0; i < pool.length; i++) {
        const candidateIndex = (cursor + i) % pool.length
        if (pool[candidateIndex].id !== prevId) {
          pickIndex = candidateIndex
          break
        }
      }
      let relaxed = false
      if (pickIndex === -1) {
        pickIndex = cursor % pool.length
        relaxed = true
      }

      const chosen = pool[pickIndex]
      assignments[String(dayIndex)][slot.key] = chosen.id
      cursor = pickIndex + 1

      if (relaxed) {
        notes.push({
          dayIndex,
          slotKey: slot.key,
          level: 'warning',
          message: `"${chosen.name}" se repite en ${slot.label} en días consecutivos: no había suficientes recetas para espaciarlas.`,
        })
      }
    }
  }

  return { assignments, notes }
}
