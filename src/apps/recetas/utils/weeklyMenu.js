import { recipeMatchesGoal, recipeMatchesMealType } from './recipeTags'
import { toDateInputValue } from './dates'

export const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export const MEAL_SLOTS = [
  { key: 'desayuno', label: 'Desayuno', mealType: 'Desayuno' },
  { key: 'almuerzo', label: 'Almuerzo', mealType: 'Almuerzo' },
  { key: 'cena', label: 'Cena', mealType: 'Cena' },
]

/** Índice "lunes-primero" (0=Lunes..6=Domingo) del día de `date` (default: hoy). */
export function mondayFirstIndex(date = new Date()) {
  return (date.getDay() + 6) % 7
}

/** Fecha ("YYYY-MM-DD") del lunes de la semana de `date`, usada como clave de semana. */
export function weekKey(date = new Date()) {
  const d = new Date(date)
  d.setDate(d.getDate() - mondayFirstIndex(d))
  d.setHours(0, 0, 0, 0)
  return toDateInputValue(d)
}

function slotValue(map, dayIndex, slotKey) {
  return map?.[String(dayIndex)]?.[slotKey] ?? null
}

/**
 * Combina la plantilla recurrente (`{ "0": { desayuno, almuerzo, cena }, ..., "6": {...} }`)
 * con los overrides vigentes de la semana actual (mismo shape, disperso), devolviendo las 7
 * filas del menú semanal en orden Lunes→Domingo, cada una con sus 3 slots.
 */
export function effectiveWeeklyMenu(templateAssignments, overrides) {
  return DAY_LABELS.map((label, dayIndex) => ({
    dayIndex,
    label,
    slots: MEAL_SLOTS.map((slot) => {
      const dayOverrides = overrides?.[String(dayIndex)]
      const isOverridden = Boolean(dayOverrides) && Object.prototype.hasOwnProperty.call(dayOverrides, slot.key)
      const templateRecipeId = slotValue(templateAssignments, dayIndex, slot.key)
      return {
        ...slot,
        recipeId: isOverridden ? dayOverrides[slot.key] : templateRecipeId,
        isOverridden,
        templateRecipeId,
      }
    }),
  }))
}

/** Recetas que hacen match con `mealType`+`goal` y no están ya asignadas en la plantilla. */
export function benchedRecipesForSlot(recipes, templateAssignments, mealType, goal) {
  const assignedIds = new Set()
  for (const dayAssignments of Object.values(templateAssignments || {})) {
    for (const recipeId of Object.values(dayAssignments || {})) {
      if (recipeId) assignedIds.add(recipeId)
    }
  }
  return recipes.filter(
    (recipe) =>
      recipeMatchesMealType(recipe, mealType) && recipeMatchesGoal(recipe, goal) && !assignedIds.has(recipe.id),
  )
}
