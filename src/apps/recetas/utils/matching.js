export function normalizeIngredientName(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function recipeMatchesIngredients(recipe, onHandList) {
  const onHandSet = new Set(onHandList.map(normalizeIngredientName))
  return recipe.ingredients.every((ing) => onHandSet.has(normalizeIngredientName(ing.name)))
}

export function filterRecipesByIngredients(recipes, onHandList) {
  if (onHandList.length === 0) return []
  return recipes.filter((recipe) => recipeMatchesIngredients(recipe, onHandList))
}
