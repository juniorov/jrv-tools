// Parseo/validación de recetas importadas desde un archivo JSON. Formato esperado:
//
// { "recetas": [
//     { "name": "Pan casero", "description": "...", "tags": ["panadería"],
//       "mealTypes": ["Desayuno"], "goals": ["Tonificar"],
//       "yieldType": "servings", "yieldValue": 8, "yieldUnit": "porciones",
//       "ingredients": [ { "name": "Harina", "quantity": 500, "unit": "g" } ],
//       "steps": [ "Mezclar todo.", "Hornear 30 minutos." ] }
//   ] }
//
// `yieldType` es opcional (default "servings"). Con "amount" el rendimiento se expresa en una
// cantidad total (ej. gramos, mililitros) y requiere "yieldUnit"; con "servings" se ignora
// "yieldUnit" y se usa siempre "porciones".
//
// `description`, `tags` y `steps` son opcionales (default '' / [] / []).
//
// `mealTypes` (opcional, default []) indica para qué comidas sirve la receta:
// "Desayuno", "Almuerzo" y/o "Cena". `goals` (opcional, default []) indica para qué objetivos
// fitness sirve: "Aumento de masa muscular", "Tonificar", "Pérdida de grasa" y/o "Cualquiera".
// Una receta sin estos campos se considera válida para cualquier comida/objetivo. Los valores
// no reconocidos se descartan sin generar error.
//
// También se acepta una sola receta como objeto raíz (sin el wrapper "recetas").

import { normalizeGoals, normalizeMealTypes } from './recipeTags'

function normalizeIngredient(raw, recipeName, index) {
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) {
    throw new Error(`La receta "${recipeName}" tiene un ingrediente sin nombre (posición ${index + 1})`)
  }
  if (!Number.isFinite(raw.quantity) || raw.quantity <= 0) {
    throw new Error(`El ingrediente "${raw.name}" de la receta "${recipeName}" no tiene una cantidad válida`)
  }
  return {
    name: raw.name.trim(),
    quantity: Number(raw.quantity),
    unit: typeof raw.unit === 'string' ? raw.unit.trim() : '',
  }
}

function normalizeRecipe(raw, index) {
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) {
    throw new Error(`La receta en posición ${index + 1} no tiene "name"`)
  }
  if (!Array.isArray(raw.ingredients) || raw.ingredients.length === 0) {
    throw new Error(`La receta "${raw.name}" no tiene "ingredients" (debe ser un arreglo con al menos un ingrediente)`)
  }
  const yieldType = raw.yieldType === 'amount' ? 'amount' : 'servings'
  if (yieldType === 'amount' && (typeof raw.yieldUnit !== 'string' || !raw.yieldUnit.trim())) {
    throw new Error(`La receta "${raw.name}" tiene yieldType "amount" pero no indica "yieldUnit"`)
  }
  if (!Number.isFinite(raw.yieldValue) || raw.yieldValue <= 0) {
    throw new Error(`La receta "${raw.name}" no tiene un "yieldValue" válido`)
  }
  return {
    name: raw.name.trim(),
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    tags: Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean) : [],
    mealTypes: normalizeMealTypes(raw.mealTypes),
    goals: normalizeGoals(raw.goals),
    yieldType,
    yieldValue: Number(raw.yieldValue),
    yieldUnit: yieldType === 'servings' ? 'porciones' : raw.yieldUnit.trim(),
    ingredients: raw.ingredients.map((ing, i) => normalizeIngredient(ing, raw.name, i)),
    steps: Array.isArray(raw.steps) ? raw.steps.map((s) => String(s).trim()).filter(Boolean) : [],
  }
}

/** Parsea el texto crudo de un archivo .json de recetas. Lanza Error con mensaje claro si no calza. */
export function parseRecipesFile(text) {
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un JSON válido')
  }

  const rawRecipes = Array.isArray(json?.recetas) ? json.recetas : [json]
  if (rawRecipes.length === 0) {
    throw new Error('El archivo no contiene ninguna receta')
  }
  return rawRecipes.map((r, i) => normalizeRecipe(r, i))
}
