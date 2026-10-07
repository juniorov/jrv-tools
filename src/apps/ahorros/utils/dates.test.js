import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatMonth,
  groupMovementsByMonth,
  monthKey,
  parseDateInput,
  toDateInputValue,
} from './dates'

describe('parseDateInput', () => {
  it('interpreta el string como fecha LOCAL, no UTC (evita el corrimiento de un día)', () => {
    const d = parseDateInput('2026-08-14')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7) // agosto = índice 7
    expect(d.getDate()).toBe(14)
  })
})

describe('toDateInputValue', () => {
  it('convierte un Date de vuelta al mismo string, sin corrimiento', () => {
    const d = parseDateInput('2026-08-14')
    expect(toDateInputValue(d)).toBe('2026-08-14')
  })

  it('acepta un Timestamp de Firestore (objeto con toDate())', () => {
    const fakeTimestamp = { toDate: () => parseDateInput('2026-01-05') }
    expect(toDateInputValue(fakeTimestamp)).toBe('2026-01-05')
  })
})

describe('formatDate', () => {
  it('formatea la misma fecha que se parseó, sin restar un día', () => {
    const d = parseDateInput('2026-08-14')
    expect(formatDate(d)).toBe('14/8/2026')
  })
})

describe('groupMovementsByMonth', () => {
  it('agrupa por mes y ordena los meses del más reciente al más antiguo', () => {
    const groups = groupMovementsByMonth([
      { id: 'old', date: '2026-01-10' },
      { id: 'new', date: '2026-03-04' },
      { id: 'same', date: '2026-03-01' },
    ])

    expect(groups.map(({ key }) => key)).toEqual(['2026-03', '2026-01'])
    expect(groups[0].movements.map(({ id }) => id)).toEqual(['new', 'same'])
    expect(groups[0].label).toMatch(/Marzo.*2026/i)
  })

  it('expone la clave YYYY-MM y un nombre legible', () => {
    expect(monthKey('2026-08-14')).toBe('2026-08')
    expect(formatMonth('2026-08-14')).toMatch(/Agosto.*2026/i)
  })
})
