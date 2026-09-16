export const ROUTINE_CATEGORIES = [
  'Piernas',
  'Empuje',
  'Tirón',
  'Full Body',
  'Cardio',
  'Natación',
  'Descanso activo',
  'Otro',
]

/** Categorías "de fuerza" sujetas a espaciado entre días consecutivos. */
export const STRENGTH_CATEGORIES = ['Piernas', 'Empuje', 'Tirón', 'Full Body']

/** Devuelve `category` si es válida, o `'Otro'` como comodín para valores ausentes/desconocidos. */
export function normalizeCategory(category) {
  return ROUTINE_CATEGORIES.includes(category) ? category : 'Otro'
}
