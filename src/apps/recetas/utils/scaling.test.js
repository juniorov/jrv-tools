import { describe, expect, it } from 'vitest'
import { roundQuantity, scaleIngredients } from './scaling'

function recipe(yieldValue, ingredients) {
  return { yieldValue, ingredients }
}

describe('roundQuantity', () => {
  it('redondea a 2 decimales por debajo de 10', () => {
    expect(roundQuantity(0.08333)).toBe(0.08)
  })

  it('redondea a 1 decimal entre 10 y 100', () => {
    expect(roundQuantity(87.04)).toBe(87)
    expect(roundQuantity(12.53)).toBe(12.5)
  })

  it('redondea a entero desde 100', () => {
    expect(roundQuantity(633.33)).toBe(633)
  })
})

describe('scaleIngredients', () => {
  it('no cambia las cantidades cuando el factor es 1', () => {
    const r = recipe(4, [{ name: 'harina', quantity: 200, unit: 'g' }])
    expect(scaleIngredients(r, 4)).toEqual([{ name: 'harina', quantity: 200, unit: 'g' }])
  })

  it('escala porciones de 4 a 6 (x1.5)', () => {
    const r = recipe(4, [{ name: 'harina', quantity: 200, unit: 'g' }])
    expect(scaleIngredients(r, 6)[0].quantity).toBe(300)
  })

  it('escala cantidad de 1000g a 500g (mitad)', () => {
    const r = recipe(1000, [{ name: 'harina', quantity: 600, unit: 'g' }])
    expect(scaleIngredients(r, 500)[0].quantity).toBe(300)
  })

  it('devuelve las cantidades originales si el objetivo es inválido', () => {
    const r = recipe(4, [{ name: 'harina', quantity: 200, unit: 'g' }])
    expect(scaleIngredients(r, 0)).toEqual(r.ingredients)
    expect(scaleIngredients(r, null)).toEqual(r.ingredients)
  })

  it('devuelve las cantidades originales si el rendimiento base es inválido', () => {
    const r = recipe(0, [{ name: 'harina', quantity: 200, unit: 'g' }])
    expect(scaleIngredients(r, 8)).toEqual(r.ingredients)
  })
})
