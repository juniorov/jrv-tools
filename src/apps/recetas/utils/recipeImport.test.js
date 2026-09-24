import { describe, expect, it } from 'vitest'
import { parseRecipesFile } from './recipeImport'

function baseRecipe(overrides = {}) {
  return {
    name: 'Pan casero',
    yieldValue: 8,
    ingredients: [{ name: 'Harina', quantity: 500, unit: 'g' }],
    ...overrides,
  }
}

describe('parseRecipesFile', () => {
  it('parsea una receta mínima válida con defaults', () => {
    const [recipe] = parseRecipesFile(JSON.stringify({ recetas: [baseRecipe()] }))
    expect(recipe).toMatchObject({
      name: 'Pan casero',
      description: '',
      tags: [],
      mealTypes: [],
      goals: [],
      yieldType: 'servings',
      yieldUnit: 'porciones',
    })
  })

  it('acepta mealTypes y goals válidos', () => {
    const [recipe] = parseRecipesFile(
      JSON.stringify({ recetas: [baseRecipe({ mealTypes: ['Desayuno', 'Cena'], goals: ['Tonificar'] })] }),
    )
    expect(recipe.mealTypes).toEqual(['Desayuno', 'Cena'])
    expect(recipe.goals).toEqual(['Tonificar'])
  })

  it('descarta valores inválidos de mealTypes/goals sin lanzar error', () => {
    const [recipe] = parseRecipesFile(
      JSON.stringify({ recetas: [baseRecipe({ mealTypes: ['Brunch', 'Cena'], goals: ['Ganar dinero'] })] }),
    )
    expect(recipe.mealTypes).toEqual(['Cena'])
    expect(recipe.goals).toEqual([])
  })

  it('lanza error si falta el nombre', () => {
    expect(() => parseRecipesFile(JSON.stringify({ recetas: [baseRecipe({ name: '' })] }))).toThrow()
  })

  it('acepta una sola receta como objeto raíz', () => {
    const [recipe] = parseRecipesFile(JSON.stringify(baseRecipe()))
    expect(recipe.name).toBe('Pan casero')
  })
})
