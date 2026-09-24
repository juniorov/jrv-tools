export function normalizeIngredientName(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Un ingrediente de receta está cubierto si algún ingrediente disponible coincide exacto,
 *  o es una coincidencia parcial (ej. "oliva" cubre "Aceite de oliva"). */
function isCovered(ingredientName, onHandTerms) {
  const normalized = normalizeIngredientName(ingredientName)
  return onHandTerms.some((term) => normalized === term || normalized.includes(term) || term.includes(normalized))
}

export function recipeMatchesIngredients(recipe, onHandList) {
  const onHandTerms = onHandList.map(normalizeIngredientName)
  return recipe.ingredients.every((ing) => isCovered(ing.name, onHandTerms))
}

export function filterRecipesByIngredients(recipes, onHandList) {
  if (onHandList.length === 0) return []
  return recipes.filter((recipe) => recipeMatchesIngredients(recipe, onHandList))
}

/** Recetas cuyo nombre o algún ingrediente contiene `text` (coincidencia parcial). */
export function searchRecipesByText(recipes, text) {
  const term = normalizeIngredientName(text)
  if (!term) return recipes
  return recipes.filter(
    (recipe) =>
      normalizeIngredientName(recipe.name).includes(term) ||
      recipe.ingredients.some((ing) => normalizeIngredientName(ing.name).includes(term)),
  )
}
