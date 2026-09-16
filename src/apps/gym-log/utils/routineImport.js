// Parseo/validación de rutinas importadas desde un archivo JSON. Formato esperado:
//
// { "routines": [
//     { "name": "Push Day A", "description": "...", "category": "Empuje", "exercises": [
//         { "name": "Press banca", "muscleGroup": "Pecho", "targetSets": 4, "targetReps": "8-10", "restSeconds": 90,
//           "videoUrl": "https://youtube.com/watch?v=..." },
//         { "name": "Plancha", "metric": "time", "targetSets": 3, "targetSeconds": 40, "restSeconds": 60 }
//       ] }
//   ] }
//
// `videoUrl` es opcional: un link a un video que sirva de guía para ejecutar el ejercicio
// (aparece como botón "Ver guía" al armar la rutina y durante el entrenamiento activo).
//
// `category` es opcional (default "Otro"). Valores válidos: "Piernas", "Empuje", "Tirón",
// "Full Body", "Cardio", "Natación", "Descanso activo", "Otro" — se usa en Plan semanal para
// recomendar cómo distribuir los días de entrenamiento sin repetir grupos musculares pesados
// seguidos.
//
// `metric` es opcional (default "reps"). Con `metric: "time"` el ejercicio se mide en segundos
// de trabajo por serie (ej. planchas, calentamientos) en vez de repeticiones — se usa
// "targetSeconds" en lugar de "targetReps". Si el JSON trae "targetSeconds" sin "metric"
// explícito, se asume "time" igual.
//
// `supersetGroup` es opcional: ejercicios CONSECUTIVOS del arreglo que comparten el mismo valor
// forman un superset (se hacen intercalados, sin descanso entre ellos, durante el entrenamiento
// activo). Ejemplo: { "name": "Sentadilla", "supersetGroup": "A" } seguido de
// { "name": "Zancadas", "supersetGroup": "A" }.
//
// También se acepta una sola rutina como objeto raíz (sin el wrapper "routines").

import { normalizeCategory } from './routineCategories'

function normalizeExercise(raw, routineName, index) {
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) {
    throw new Error(`La rutina "${routineName}" tiene un ejercicio sin nombre (posición ${index + 1})`)
  }
  const metric = raw.metric === 'time' || Number.isFinite(raw.targetSeconds) ? 'time' : 'reps'
  return {
    name: raw.name.trim(),
    muscleGroup: raw.muscleGroup ?? '',
    metric,
    targetSets: Number.isFinite(raw.targetSets) ? raw.targetSets : null,
    targetReps: metric === 'reps' ? (raw.targetReps ?? '') : '',
    targetSeconds: metric === 'time' && Number.isFinite(raw.targetSeconds) ? raw.targetSeconds : null,
    restSeconds: Number.isFinite(raw.restSeconds) ? raw.restSeconds : null,
    supersetGroup: raw.supersetGroup != null ? String(raw.supersetGroup) : null,
    notes: raw.notes ?? '',
    videoUrl: raw.videoUrl ?? '',
  }
}

function normalizeRoutine(raw, index) {
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) {
    throw new Error(`La rutina en posición ${index + 1} no tiene "name"`)
  }
  if (!Array.isArray(raw.exercises) || raw.exercises.length === 0) {
    throw new Error(`La rutina "${raw.name}" no tiene "exercises" (debe ser un arreglo con al menos un ejercicio)`)
  }
  return {
    name: raw.name.trim(),
    description: raw.description ?? '',
    category: normalizeCategory(raw.category),
    exercises: raw.exercises.map((ex, i) => normalizeExercise(ex, raw.name, i)),
  }
}

/** Parsea el texto crudo de un archivo .json de rutinas. Lanza Error con mensaje claro si no calza. */
export function parseRoutinesFile(text) {
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un JSON válido')
  }

  const rawRoutines = Array.isArray(json?.routines) ? json.routines : [json]
  if (rawRoutines.length === 0) {
    throw new Error('El archivo no contiene ninguna rutina')
  }
  return rawRoutines.map((r, i) => normalizeRoutine(r, i))
}
