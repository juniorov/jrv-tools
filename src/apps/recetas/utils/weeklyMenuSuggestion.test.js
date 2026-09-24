import { describe, expect, it } from 'vitest'
import { suggestWeeklyMenu } from './weeklyMenuSuggestion'

function recipe(id, name, mealTypes, goals = []) {
  return { id, name, mealTypes, goals }
}

describe('suggestWeeklyMenu', () => {
  it('filtra por mealType y objetivo, asignando las 7 celdas de cada slot', () => {
    const recipes = [
      recipe('r1', 'Avena', ['Desayuno']),
      recipe('r2', 'Pollo', ['Almuerzo', 'Cena'], ['Tonificar']),
      recipe('r3', 'Pescado', ['Almuerzo', 'Cena'], ['Pérdida de grasa']),
    ]
    const { assignments } = suggestWeeklyMenu(recipes, { goal: 'Tonificar' })
    for (let i = 0; i < 7; i++) {
      expect(assignments[String(i)].desayuno).toBe('r1')
      expect(assignments[String(i)].almuerzo).toBe('r2')
      expect(assignments[String(i)].cena).toBe('r2')
    }
  })

  it('"Cualquiera" incluye recetas sin objetivo y con objetivo específico', () => {
    const recipes = [recipe('r1', 'Avena', ['Desayuno']), recipe('r2', 'Batido', ['Desayuno'], ['Tonificar'])]
    const { assignments } = suggestWeeklyMenu(recipes, { goal: 'Cualquiera' })
    expect(['r1', 'r2']).toContain(assignments['0'].desayuno)
  })

  it('evita repetir la misma receta en días adyacentes cuando el pool lo permite', () => {
    const recipes = [recipe('r1', 'A', ['Desayuno']), recipe('r2', 'B', ['Desayuno'])]
    const { assignments } = suggestWeeklyMenu(recipes, { goal: 'Cualquiera' })
    for (let i = 1; i < 7; i++) {
      expect(assignments[String(i)].desayuno).not.toBe(assignments[String(i - 1)].desayuno)
    }
  })

  it('pool vacío asigna null y deja una nota informativa', () => {
    const { assignments, notes } = suggestWeeklyMenu([], { goal: 'Tonificar' })
    expect(assignments['0'].desayuno).toBeNull()
    expect(notes.some((n) => n.slotKey === 'desayuno' && n.level === 'info')).toBe(true)
  })

  it('con un solo candidato, repite y agrega nota de advertencia', () => {
    const recipes = [recipe('r1', 'Única', ['Desayuno'])]
    const { assignments, notes } = suggestWeeklyMenu(recipes, { goal: 'Cualquiera' })
    for (let i = 0; i < 7; i++) expect(assignments[String(i)].desayuno).toBe('r1')
    expect(notes.some((n) => n.level === 'warning' && n.slotKey === 'desayuno')).toBe(true)
  })
})
