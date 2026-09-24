import { describe, expect, it } from 'vitest'
import { filterRecipesByIngredients, normalizeIngredientName, recipeMatchesIngredients, searchRecipesByText } from './matching'

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

  it('coincide parcialmente (ej. "oliva" cubre "Aceite de oliva")', () => {
    const r = recipe('Marinada', ['Aceite de oliva', 'Sal'])
    expect(recipeMatchesIngredients(r, ['oliva', 'sal'])).toBe(true)
  })

  it('coincide parcialmente en sentido inverso (término disponible más específico)', () => {
    const r = recipe('Marinada', ['Aceite'])
    expect(recipeMatchesIngredients(r, ['aceite de oliva'])).toBe(true)
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

describe('searchRecipesByText', () => {
  const marinada = recipe('Marinada de ajo', ['Aceite de oliva', 'Ajo'])
  const pure = recipe('Puré', ['Papa', 'Leche'])

  it('encuentra recetas por ingrediente aunque no tengan todos los demás', () => {
    expect(searchRecipesByText([marinada, pure], 'oliva')).toEqual([marinada])
  })

  it('encuentra recetas por nombre', () => {
    expect(searchRecipesByText([marinada, pure], 'puré')).toEqual([pure])
  })

  it('sin texto devuelve todas las recetas', () => {
    expect(searchRecipesByText([marinada, pure], '')).toEqual([marinada, pure])
  })
})
