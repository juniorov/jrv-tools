export function roundQuantity(value) {
  if (value == null || Number.isNaN(value)) return value
  if (value < 10) return Math.round(value * 100) / 100
  if (value < 100) return Math.round(value * 10) / 10
  return Math.round(value)
}

export function scaleIngredients(recipe, targetAmount) {
  const base = Number(recipe.yieldValue)
  const target = Number(targetAmount)
  if (!base || base <= 0 || !target || target <= 0) {
    return recipe.ingredients.map((ing) => ({ ...ing }))
  }
  const scale = target / base
  return recipe.ingredients.map((ing) => ({
    ...ing,
    quantity: roundQuantity(ing.quantity * scale),
  }))
}
