import { workoutVolume } from './progress'

/**
 * Agrupa ejercicios CONSECUTIVOS que comparten `supersetGroup` en un mismo bloque. Un bloque de
 * un solo ejercicio es el caso normal (sin superset); un bloque de 2+ es un superset.
 */
function groupIntoBlocks(exercises) {
  const blocks = []
  let i = 0
  while (i < exercises.length) {
    const exercise = exercises[i]
    if (exercise.supersetGroup == null) {
      blocks.push([exercise])
      i += 1
      continue
    }
    const block = [exercise]
    let j = i + 1
    while (j < exercises.length && exercises[j].supersetGroup === exercise.supersetGroup) {
      block.push(exercises[j])
      j += 1
    }
    blocks.push(block)
    i = j
  }
  return blocks
}

function blankStepFrom(exercise, setNumber, supersetLabel) {
  return {
    exerciseName: exercise.name,
    metric: exercise.metric,
    setNumber,
    targetReps: exercise.targetReps,
    targetSeconds: exercise.targetSeconds,
    restSeconds: exercise.restSeconds,
    supersetLabel,
    videoUrl: exercise.videoUrl || '',
    reps: null,
    weight: null,
    seconds: null,
    done: false,
  }
}

/**
 * Construye el arreglo plano de steps de una sesión activa, ya intercalado en el orden real de
 * ejecución: dentro de un bloque superset, las rondas alternan entre sus ejercicios (ronda 1 de
 * A, ronda 1 de B, ronda 2 de A, ronda 2 de B, ...). El número de rondas de un bloque es el
 * máximo de `targetSets` entre sus ejercicios; un ejercicio con menos series simplemente no
 * aparece en las rondas finales del bloque.
 */
export function buildStepsFromRoutine(routine) {
  const blocks = groupIntoBlocks(routine.exercises)
  const steps = []

  for (const block of blocks) {
    const supersetLabel = block.length > 1 ? `Superset: ${block.map((e) => e.name).join(' + ')}` : null
    const rounds = Math.max(...block.map((e) => e.targetSets || 1))
    for (let round = 1; round <= rounds; round++) {
      for (const exercise of block) {
        if (round > (exercise.targetSets || 1)) continue
        steps.push(blankStepFrom(exercise, round, supersetLabel))
      }
    }
  }

  return steps
}

/**
 * Agrupa el arreglo plano de steps por ejercicio (en su orden de primera aparición), para
 * mostrar cada ejercicio como una tarjeta con todas sus series juntas —incluso si en `steps`
 * están intercaladas por ser parte de un superset—. Cada entrada conserva el step original (para
 * mutarlo in-place) junto a su índice en el arreglo plano.
 */
export function groupStepsForDisplay(steps) {
  const order = []
  const byName = new Map()

  steps.forEach((step, index) => {
    if (!byName.has(step.exerciseName)) {
      byName.set(step.exerciseName, {
        exerciseName: step.exerciseName,
        metric: step.metric,
        supersetLabel: step.supersetLabel,
        videoUrl: step.videoUrl,
        items: [],
      })
      order.push(step.exerciseName)
    }
    byName.get(step.exerciseName).items.push({ step, index })
  })

  return order.map((name) => byName.get(name))
}

/**
 * Convierte los steps ya marcados como `done` de vuelta al shape `{ name, sets: [...] }` que usa
 * `gym_log_workouts` (mismo formato que ya consumen el historial, el calendario y el gráfico de
 * progreso), agrupando por ejercicio en su orden de primera aparición.
 */
export function stepsToExercises(steps) {
  const order = []
  const byName = new Map()

  for (const step of steps) {
    if (!step.done) continue
    if (!byName.has(step.exerciseName)) {
      byName.set(step.exerciseName, { name: step.exerciseName, sets: [] })
      order.push(step.exerciseName)
    }
    const set = step.metric === 'time' ? { seconds: step.seconds, weight: step.weight } : { reps: step.reps, weight: step.weight }
    byName.get(step.exerciseName).sets.push(set)
  }

  return order.map((name) => byName.get(name))
}

/** Formatea milisegundos como "mm:ss", o "h:mm:ss" si dura una hora o más. */
export function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

/**
 * Resumen final de una sesión: duración total, volumen (peso×reps, vía `workoutVolume`), reps y
 * segundos totales trabajados, y los `exercises` ya listos para guardar en `gym_log_workouts`.
 */
export function sessionSummary(session, finishedAt = Date.now()) {
  const exercises = stepsToExercises(session.steps)
  const totalVolume = workoutVolume({ exercises })
  const totalReps = session.steps
    .filter((s) => s.done && s.metric === 'reps')
    .reduce((sum, s) => sum + (Number(s.reps) || 0), 0)
  const totalSeconds = session.steps
    .filter((s) => s.done && s.metric === 'time')
    .reduce((sum, s) => sum + (Number(s.seconds) || 0), 0)

  return {
    durationMs: finishedAt - session.startedAt,
    totalVolume,
    totalReps,
    totalSeconds,
    exercises,
  }
}
