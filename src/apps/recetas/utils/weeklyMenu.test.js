import { describe, expect, it } from 'vitest'
import { benchedRecipesForSlot, effectiveWeeklyMenu, mondayFirstIndex, weekKey } from './weeklyMenu'

describe('mondayFirstIndex', () => {
  it('devuelve 0 para un lunes y 6 para un domingo', () => {
    expect(mondayFirstIndex(new Date(2026, 7, 10))).toBe(0)
    expect(mondayFirstIndex(new Date(2026, 7, 16))).toBe(6)
  })
})

describe('weekKey', () => {
  it('devuelve el lunes de la semana para cualquier día de esa semana', () => {
    expect(weekKey(new Date(2026, 7, 13))).toBe('2026-08-10')
  })
})

describe('effectiveWeeklyMenu', () => {
  const template = { '0': { desayuno: 'r1', almuerzo: 'r2', cena: null } }

  it('usa la plantilla cuando no hay override para ese slot', () => {
    const plan = effectiveWeeklyMenu(template, {})
    expect(plan[0].slots).toEqual([
      { key: 'desayuno', label: 'Desayuno', mealType: 'Desayuno', recipeId: 'r1', isOverridden: false, templateRecipeId: 'r1' },
      { key: 'almuerzo', label: 'Almuerzo', mealType: 'Almuerzo', recipeId: 'r2', isOverridden: false, templateRecipeId: 'r2' },
      { key: 'cena', label: 'Cena', mealType: 'Cena', recipeId: null, isOverridden: false, templateRecipeId: null },
    ])
  })

  it('el override tiene precedencia sobre la plantilla, por slot', () => {
    const plan = effectiveWeeklyMenu(template, { '0': { desayuno: 'r99' } })
    expect(plan[0].slots[0]).toMatchObject({ recipeId: 'r99', isOverridden: true, templateRecipeId: 'r1' })
    expect(plan[0].slots[1]).toMatchObject({ recipeId: 'r2', isOverridden: false })
  })
})

describe('benchedRecipesForSlot', () => {
  const recipes = [
    { id: 'r1', name: 'Avena', mealTypes: ['Desayuno'], goals: [] },
    { id: 'r2', name: 'Pollo', mealTypes: ['Almuerzo', 'Cena'], goals: ['Tonificar'] },
    { id: 'r3', name: 'Ensalada', mealTypes: ['Almuerzo'], goals: ['Pérdida de grasa'] },
  ]
  const template = { '0': { desayuno: 'r1', almuerzo: null, cena: null } }

  it('excluye recetas ya asignadas y filtra por comida+objetivo', () => {
    const benched = benchedRecipesForSlot(recipes, template, 'Almuerzo', 'Tonificar')
    expect(benched.map((r) => r.id)).toEqual(['r2'])
  })

  it('"Cualquiera" incluye todas las recetas compatibles con la comida', () => {
    const benched = benchedRecipesForSlot(recipes, template, 'Almuerzo', 'Cualquiera')
    expect(benched.map((r) => r.id).sort()).toEqual(['r2', 'r3'])
  })
})
