import { describe, expect, it } from 'vitest'
import { filterRecipesByIngredients, normalizeIngredientName, recipeMatchesIngredients } from './matching'

function recipe(name, ingredientNames) {
  return { name, ingredients: ingredientNames.map((n) => ({ name: n, quantity: 1, unit: 'g' })) }
}

describe('normalizeIngredientName', () => {
  it('recorta espacios y pasa a minúsculas', () => {
    expect(normalizeIngredientName('  Sal  ')).toBe('sal')
  })

  it('ignora acentos', () => {
    expect(normalizeIngredientName('Azúcar')).toBe('azucar')
  })
})

describe('recipeMatchesIngredients', () => {
  it('coincide cuando todos los ingredientes están cubiertos', () => {
    const r = recipe('Arroz con sal', ['arroz', 'sal'])
    expect(recipeMatchesIngredients(r, ['arroz', 'sal', 'aceite'])).toBe(true)
  })

  it('no coincide si falta un ingrediente', () => {
    const r = recipe('Arroz con sal', ['arroz', 'sal'])
    expect(recipeMatchesIngredients(r, ['arroz'])).toBe(false)
  })

  it('es insensible a mayúsculas y acentos', () => {
    const r = recipe('Puré', ['papa', 'azúcar'])
    expect(recipeMatchesIngredients(r, ['PAPA', 'azucar'])).toBe(true)
  })

  it('una receta sin ingredientes siempre coincide', () => {
    const r = recipe('Agua', [])
    expect(recipeMatchesIngredients(r, [])).toBe(true)
  })
})

describe('filterRecipesByIngredients', () => {
  it('devuelve vacío si no hay ingredientes disponibles', () => {
    const recipes = [recipe('Arroz', ['arroz'])]
    expect(filterRecipesByIngredients(recipes, [])).toEqual([])
  })

  it('filtra solo las recetas totalmente cubiertas', () => {
    const arroz = recipe('Arroz', ['arroz', 'sal'])
    const pure = recipe('Puré', ['papa', 'leche'])
    const result = filterRecipesByIngredients([arroz, pure], ['arroz', 'sal'])
    expect(result).toEqual([arroz])
  })
})
