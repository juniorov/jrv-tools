import { describe, expect, it } from 'vitest'
import { suggestWeeklyPlan } from './weeklySuggestion'
import { normalizeCategory } from './routineCategories'

function routine(id, category) {
  return { id, name: id, category }
}

function categoryOf(routines, assignments, dayIndex) {
  const id = assignments[String(dayIndex)]
  return routines.find((r) => r.id === id)?.category ?? null
}

describe('suggestWeeklyPlan', () => {
  it('espacia dos rutinas de Piernas cuando hay suficientes otras categorías', () => {
    const routines = [
      routine('legs1', 'Piernas'),
      routine('legs2', 'Piernas'),
      routine('push', 'Empuje'),
      routine('pull', 'Tirón'),
      routine('full', 'Full Body'),
    ]
    const { assignments, notes } = suggestWeeklyPlan(routines)
    const legDays = [0, 1, 2, 3, 4].filter((d) => categoryOf(routines, assignments, d) === 'Piernas')
    expect(legDays.length).toBe(2)
    expect(Math.abs(legDays[0] - legDays[1])).toBeGreaterThan(1)
    expect(notes.some((n) => n.level === 'warning')).toBe(false)
  })

  it('relaja el espaciado y avisa cuando no hay otras categorías suficientes', () => {
    const routines = [
      routine('l1', 'Piernas'),
      routine('l2', 'Piernas'),
      routine('l3', 'Piernas'),
      routine('l4', 'Piernas'),
    ]
    const { assignments, notes } = suggestWeeklyPlan(routines)
    const assigned = Object.values(assignments).filter(Boolean)
    expect(assigned.length).toBe(4)
    expect(notes.some((n) => n.level === 'warning' && n.message.includes('Piernas'))).toBe(true)
  })

  it('evita Piernas el día siguiente a Natación cuando hay alternativa', () => {
    const routines = [
      routine('swim', 'Natación'),
      routine('legs', 'Piernas'),
      routine('push', 'Empuje'),
      routine('pull', 'Tirón'),
    ]
    const { assignments, notes } = suggestWeeklyPlan(routines)
    const swimDay = Object.keys(assignments).find((k) => assignments[k] === 'swim')
    const nextDay = Number(swimDay) + 1
    if (nextDay <= 6) {
      expect(assignments[String(nextDay)]).not.toBe('legs')
    }
    expect(notes.some((n) => n.message.includes('Piernas justo después de Natación'))).toBe(false)
  })

  it('coloca Piernas después de Natación si es la única opción restante, y avisa', () => {
    const fixed = { '0': 'swim' }
    const routines = [routine('swim', 'Natación'), routine('legs', 'Piernas')]
    const { assignments, notes } = suggestWeeklyPlan(routines, { fixed })
    expect(assignments['0']).toBe('swim')
    expect(Object.values(assignments)).toContain('legs')
    const hasWarning = notes.some((n) => n.message.includes('Piernas justo después de Natación'))
    if (assignments['1'] === 'legs') {
      expect(hasWarning).toBe(true)
    }
  })

  it('deja descanso (null) en los días sobrantes cuando hay menos rutinas que días', () => {
    const routines = [routine('a', 'Empuje'), routine('b', 'Tirón')]
    const { assignments, notes } = suggestWeeklyPlan(routines)
    const restDays = Object.values(assignments).filter((v) => v === null)
    expect(restDays.length).toBe(5)
    expect(notes.some((n) => n.level === 'info' && n.message.includes('descanso'))).toBe(true)
  })

  it('solo asigna 7 rutinas cuando sobran, dejando el resto disponible', () => {
    const routines = Array.from({ length: 9 }, (_, i) => routine(`r${i}`, 'Otro'))
    const { assignments, notes } = suggestWeeklyPlan(routines)
    const assigned = Object.values(assignments).filter(Boolean)
    expect(assigned.length).toBe(7)
    expect(notes.some((n) => n.level === 'info' && n.message.includes('Sobraron rutinas'))).toBe(true)
  })

  it('trata las rutinas sin category como comodín "Otro", sin generar warnings', () => {
    const routines = [routine('a', undefined), routine('b', undefined), routine('c', 'Piernas')]
    const { assignments, notes } = suggestWeeklyPlan(routines)
    expect(Object.values(assignments).filter(Boolean).length).toBe(3)
    expect(notes.some((n) => n.level === 'warning')).toBe(false)
  })

  it('respeta los días fijados y no reutiliza esa rutina en otro día', () => {
    const routines = [routine('a', 'Empuje'), routine('b', 'Tirón'), routine('c', 'Piernas')]
    const { assignments } = suggestWeeklyPlan(routines, { fixed: { '2': 'c' } })
    expect(assignments['2']).toBe('c')
    const otherDays = Object.entries(assignments).filter(([k]) => k !== '2')
    expect(otherDays.some(([, v]) => v === 'c')).toBe(false)
  })
})

describe('normalizeCategory', () => {
  it('devuelve la categoría si es válida', () => {
    expect(normalizeCategory('Piernas')).toBe('Piernas')
  })

  it('devuelve "Otro" para valores inválidos, undefined o vacíos', () => {
    expect(normalizeCategory('Inventado')).toBe('Otro')
    expect(normalizeCategory(undefined)).toBe('Otro')
    expect(normalizeCategory('')).toBe('Otro')
  })
})
