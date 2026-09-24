import { describe, expect, it } from 'vitest'
import { computeBmi, deltaFromFirst, latestEntry, metricSeries, sortByDate } from './bodyMetrics'

describe('computeBmi', () => {
  it('calcula el IMC redondeado a 1 decimal', () => {
    expect(computeBmi(63.5, 168)).toBeCloseTo(22.5, 1)
  })

  it('devuelve null con datos inválidos', () => {
    expect(computeBmi(0, 168)).toBeNull()
    expect(computeBmi(63.5, 0)).toBeNull()
    expect(computeBmi(NaN, 168)).toBeNull()
  })
})

describe('sortByDate', () => {
  it('ordena ascendente por fecha', () => {
    const entries = [{ date: '2026-05-11' }, { date: '2026-04-06' }, { date: '2026-04-27' }]
    expect(sortByDate(entries).map((e) => e.date)).toEqual(['2026-04-06', '2026-04-27', '2026-05-11'])
  })
})

describe('metricSeries', () => {
  it('omite entradas sin el campo pedido', () => {
    const entries = [
      { date: '2026-04-06', weightKg: 64.35 },
      { date: '2026-04-13', weightKg: null },
      { date: '2026-04-20', weightKg: 62.85 },
    ]
    expect(metricSeries(entries, 'weightKg')).toEqual([
      { date: '2026-04-06', value: 64.35 },
      { date: '2026-04-20', value: 62.85 },
    ])
  })
})

describe('latestEntry', () => {
  it('devuelve la entrada más reciente', () => {
    const entries = [{ date: '2026-04-06' }, { date: '2026-04-20' }]
    expect(latestEntry(entries)).toEqual({ date: '2026-04-20' })
  })

  it('devuelve null si no hay entradas', () => {
    expect(latestEntry([])).toBeNull()
  })
})

describe('deltaFromFirst', () => {
  it('calcula la diferencia entre la última y la primera entrada', () => {
    const entries = [
      { date: '2026-04-06', weightKg: 64.35 },
      { date: '2026-05-18', weightKg: 62.45 },
    ]
    expect(deltaFromFirst(entries, 'weightKg')).toBeCloseTo(-1.9, 1)
  })

  it('devuelve null con menos de 2 entradas válidas', () => {
    expect(deltaFromFirst([{ date: '2026-04-06', weightKg: 64.35 }], 'weightKg')).toBeNull()
  })
})
