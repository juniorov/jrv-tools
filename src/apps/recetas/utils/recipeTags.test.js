import { describe, expect, it } from 'vitest'
import { isPlatillo, normalizeGoals, normalizeMealTypes, normalizeRecipeType, recipeMatchesGoal, recipeMatchesMealType } from './recipeTags'

describe('normalizeMealTypes', () => {
  it('conserva solo valores válidos', () => {
    expect(normalizeMealTypes(['Desayuno', 'Brunch', 'Cena'])).toEqual(['Desayuno', 'Cena'])
  })

  it('devuelve [] para entradas inválidas', () => {
    expect(normalizeMealTypes(null)).toEqual([])
    expect(normalizeMealTypes('Desayuno')).toEqual([])
  })
})

describe('normalizeGoals', () => {
  it('conserva solo valores válidos', () => {
    expect(normalizeGoals(['Tonificar', 'Ganar dinero'])).toEqual(['Tonificar'])
  })
})

describe('recipeMatchesGoal', () => {
  it('una receta sin goals coincide con cualquier objetivo', () => {
    expect(recipeMatchesGoal({ goals: [] }, 'Tonificar')).toBe(true)
  })

  it('"Cualquiera" en la receta coincide con cualquier objetivo', () => {
    expect(recipeMatchesGoal({ goals: ['Cualquiera'] }, 'Tonificar')).toBe(true)
  })

  it('coincide exacto', () => {
    expect(recipeMatchesGoal({ goals: ['Tonificar'] }, 'Tonificar')).toBe(true)
    expect(recipeMatchesGoal({ goals: ['Tonificar'] }, 'Pérdida de grasa')).toBe(false)
  })

  it('pedir "Cualquiera" coincide con toda receta', () => {
    expect(recipeMatchesGoal({ goals: ['Tonificar'] }, 'Cualquiera')).toBe(true)
  })
})

describe('recipeMatchesMealType', () => {
  it('una receta sin mealTypes coincide con cualquier comida (retrocompat)', () => {
    expect(recipeMatchesMealType({ mealTypes: [] }, 'Desayuno')).toBe(true)
  })

  it('coincide exacto', () => {
    expect(recipeMatchesMealType({ mealTypes: ['Almuerzo', 'Cena'] }, 'Cena')).toBe(true)
    expect(recipeMatchesMealType({ mealTypes: ['Almuerzo'] }, 'Desayuno')).toBe(false)
  })
})

describe('normalizeRecipeType', () => {
  it('conserva valores válidos', () => {
    expect(normalizeRecipeType('Platillo')).toBe('Platillo')
    expect(normalizeRecipeType('Marinada/Adobo')).toBe('Marinada/Adobo')
  })

  it('devuelve "" para valores inválidos o ausentes', () => {
    expect(normalizeRecipeType('Postre')).toBe('')
    expect(normalizeRecipeType(undefined)).toBe('')
  })
})

describe('isPlatillo', () => {
  it('solo es true con recipeType exactamente "Platillo"', () => {
    expect(isPlatillo({ recipeType: 'Platillo' })).toBe(true)
    expect(isPlatillo({ recipeType: 'Marinada/Adobo' })).toBe(false)
  })

  it('una receta sin recipeType NO cuenta como Platillo (sin comodín, a diferencia de mealTypes/goals)', () => {
    expect(isPlatillo({})).toBe(false)
    expect(isPlatillo({ recipeType: '' })).toBe(false)
  })
})
