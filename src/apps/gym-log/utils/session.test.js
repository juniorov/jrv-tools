import { describe, expect, it } from 'vitest'
import { buildStepsFromRoutine, formatElapsed, sessionSummary, stepsToExercises } from './session'

function exercise(overrides) {
  return {
    name: 'Ejercicio',
    metric: 'reps',
    targetSets: 3,
    targetReps: '10',
    targetSeconds: null,
    restSeconds: null,
    supersetGroup: null,
    ...overrides,
  }
}

describe('buildStepsFromRoutine', () => {
  it('genera un step por serie para ejercicios sin superset', () => {
    const routine = { exercises: [exercise({ name: 'Press banca', targetSets: 3 })] }
    const steps = buildStepsFromRoutine(routine)
    expect(steps).toHaveLength(3)
    expect(steps.map((s) => s.setNumber)).toEqual([1, 2, 3])
    expect(steps.every((s) => s.exerciseName === 'Press banca' && s.supersetLabel === null)).toBe(true)
    expect(steps.every((s) => s.reps === 10)).toBe(true)
  })

  it('no fuerza metas no numéricas como repeticiones', () => {
    const routine = { exercises: [exercise({ targetReps: '8-10' })] }
    expect(buildStepsFromRoutine(routine)[0].reps).toBeNull()
  })

  it('intercala las rondas de un superset (A1, B1, A2, B2, ...)', () => {
    const routine = {
      exercises: [
        exercise({ name: 'Sentadilla', targetSets: 2, supersetGroup: 'A' }),
        exercise({ name: 'Zancadas', targetSets: 2, supersetGroup: 'A' }),
      ],
    }
    const steps = buildStepsFromRoutine(routine)
    expect(steps.map((s) => s.exerciseName)).toEqual(['Sentadilla', 'Zancadas', 'Sentadilla', 'Zancadas'])
    expect(steps[0].supersetLabel).toBe('Superset: Sentadilla + Zancadas')
  })

  it('no agrupa ejercicios con el mismo supersetGroup si no son consecutivos', () => {
    const routine = {
      exercises: [
        exercise({ name: 'A', targetSets: 1, supersetGroup: 'X' }),
        exercise({ name: 'B', targetSets: 1 }),
        exercise({ name: 'C', targetSets: 1, supersetGroup: 'X' }),
      ],
    }
    const steps = buildStepsFromRoutine(routine)
    expect(steps.map((s) => s.supersetLabel)).toEqual([null, null, null])
  })

  it('usa el máximo de targetSets del bloque como número de rondas; el ejercicio con menos sets no aparece en las rondas finales', () => {
    const routine = {
      exercises: [
        exercise({ name: 'A', targetSets: 3, supersetGroup: 'A' }),
        exercise({ name: 'B', targetSets: 1, supersetGroup: 'A' }),
      ],
    }
    const steps = buildStepsFromRoutine(routine)
    expect(steps.map((s) => s.exerciseName)).toEqual(['A', 'B', 'A', 'A'])
  })
})

describe('stepsToExercises', () => {
  it('agrupa solo los steps done, por ejercicio, en orden de primera aparición', () => {
    const steps = [
      { exerciseName: 'A', metric: 'reps', reps: 10, weight: 20, done: true },
      { exerciseName: 'B', metric: 'reps', reps: 8, weight: 15, done: false },
      { exerciseName: 'A', metric: 'reps', reps: 9, weight: 20, done: true },
    ]
    const exercises = stepsToExercises(steps)
    expect(exercises).toEqual([{ name: 'A', sets: [{ reps: 10, weight: 20 }, { reps: 9, weight: 20 }] }])
  })

  it('usa "seconds" en vez de "reps" para ejercicios por tiempo', () => {
    const steps = [{ exerciseName: 'Plancha', metric: 'time', seconds: 40, weight: 0, done: true }]
    expect(stepsToExercises(steps)).toEqual([{ name: 'Plancha', sets: [{ seconds: 40, weight: 0 }] }])
  })

  it('recupera la meta numérica de una sesión antigua que guardó reps como null', () => {
    const steps = [{
      exerciseName: 'Press banca',
      metric: 'reps',
      targetReps: '10',
      reps: null,
      weight: 20,
      done: true,
    }]
    expect(stepsToExercises(steps)).toEqual([{ name: 'Press banca', sets: [{ reps: 10, weight: 20 }] }])
    expect(sessionSummary({ startedAt: 0, steps }, 1000).totalVolume).toBe(200)
  })
})

describe('formatElapsed', () => {
  it('formatea segundos y minutos como mm:ss', () => {
    expect(formatElapsed(65_000)).toBe('1:05')
  })

  it('formatea una hora o más como h:mm:ss', () => {
    expect(formatElapsed(3661_000)).toBe('1:01:01')
  })
})

describe('sessionSummary', () => {
  it('calcula duración, volumen y reps totales de los steps done', () => {
    const session = {
      startedAt: 1000,
      steps: [
        { exerciseName: 'Press banca', metric: 'reps', reps: 10, weight: 60, done: true },
        { exerciseName: 'Press banca', metric: 'reps', reps: 8, weight: 60, done: true },
        { exerciseName: 'Plancha', metric: 'time', seconds: 40, weight: 0, done: true },
        { exerciseName: 'Descartado', metric: 'reps', reps: 5, weight: 20, done: false },
      ],
    }
    const summary = sessionSummary(session, 61_000)
    expect(summary.durationMs).toBe(60_000)
    expect(summary.totalVolume).toBe(60 * 10 + 60 * 8)
    expect(summary.totalReps).toBe(18)
    expect(summary.totalSeconds).toBe(40)
    expect(summary.exercises).toEqual([
      { name: 'Press banca', sets: [{ reps: 10, weight: 60 }, { reps: 8, weight: 60 }] },
      { name: 'Plancha', sets: [{ seconds: 40, weight: 0 }] },
    ])
  })
})
