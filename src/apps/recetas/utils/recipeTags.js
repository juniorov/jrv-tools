export const MEAL_TYPES = ['Desayuno', 'Almuerzo', 'Cena']

export const FITNESS_GOALS = ['Aumento de masa muscular', 'Tonificar', 'Pérdida de grasa', 'Cualquiera']

export const RECIPE_TYPES = ['Platillo', 'Marinada/Adobo']

/** Valor válido de RECIPE_TYPES, o '' (sin clasificar) para cualquier otra cosa. */
export function normalizeRecipeType(recipeType) {
  return RECIPE_TYPES.includes(recipeType) ? recipeType : ''
}

/**
 * A diferencia de mealTypes/goals, una receta sin `recipeType` NO se considera "Platillo" por
 * comodín: el menú semanal debe armarse solo con platillos completos, así que las recetas sin
 * clasificar (o marcadas como marinada/adobo) quedan afuera hasta que se etiqueten a mano.
 */
export function isPlatillo(recipe) {
  return recipe.recipeType === 'Platillo'
}

/** Filtra `mealTypes` a los valores válidos de MEAL_TYPES; descarta lo demás. */
export function normalizeMealTypes(mealTypes) {
  if (!Array.isArray(mealTypes)) return []
  return [...new Set(mealTypes.filter((m) => MEAL_TYPES.includes(m)))]
}

/** Filtra `goals` a los valores válidos de FITNESS_GOALS; descarta lo demás. */
export function normalizeGoals(goals) {
  if (!Array.isArray(goals)) return []
  return [...new Set(goals.filter((g) => FITNESS_GOALS.includes(g)))]
}

/** Una receta sin `goals` (o con 'Cualquiera') sirve para cualquier objetivo. */
export function recipeMatchesGoal(recipe, goal) {
  const goals = recipe.goals || []
  if (!goal || goal === 'Cualquiera') return true
  return goals.length === 0 || goals.includes('Cualquiera') || goals.includes(goal)
}

/** Una receta sin `mealTypes` (recetas antiguas) sirve para cualquier comida. */
export function recipeMatchesMealType(recipe, mealType) {
  const mealTypes = recipe.mealTypes || []
  return mealTypes.length === 0 || mealTypes.includes(mealType)
}
