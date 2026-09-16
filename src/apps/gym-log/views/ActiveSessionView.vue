<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { deleteActiveSession, finishSession, getActiveSession, updateSessionProgress } from '../services/sesiones'
import { getWorkouts } from '../services/entrenamientos'
import { formatElapsed, groupStepsForDisplay, stepsToExercises } from '../utils/session'
import { workoutVolume } from '../utils/progress'
import { kgToLb, lbToKg } from '../utils/units'

const router = useRouter()

const session = ref(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const summary = ref(null)
const unitByExercise = ref({})
const restByExercise = ref({})
const previousValues = ref(new Map())

const elapsedMs = ref(0)
let elapsedTimer = null

const resting = ref(false)
const restRemaining = ref(0)
let restTimer = null

const totalSteps = computed(() => session.value?.steps.length ?? 0)
const doneSteps = computed(() => session.value?.steps.filter((s) => s.done).length ?? 0)
const groupedExercises = computed(() => (session.value ? groupStepsForDisplay(session.value.steps) : []))
const liveVolume = computed(() =>
  session.value ? workoutVolume({ exercises: stepsToExercises(session.value.steps) }) : 0,
)

function previousKey(step) {
  return `${step.exerciseName}#${step.setNumber}`
}

function unitFor(exerciseName) {
  return unitByExercise.value[exerciseName] || 'kg'
}

function setUnitFor(exerciseName, unit) {
  unitByExercise.value = { ...unitByExercise.value, [exerciseName]: unit }
}

function formatSetValue(set, metric, unit) {
  if (!set) return '—'
  const displayWeight = set.weight != null ? (unit === 'lb' ? kgToLb(set.weight) : set.weight) : null
  const weightLabel = displayWeight != null ? `${displayWeight}${unit}` : ''
  if (metric === 'time') {
    return set.seconds != null ? `${weightLabel ? weightLabel + ' · ' : ''}${set.seconds}s` : '—'
  }
  return set.reps != null ? `${weightLabel ? weightLabel + ' x ' : ''}${set.reps}` : '—'
}

function anteriorLabel(step) {
  return formatSetValue(previousValues.value.get(previousKey(step)), step.metric, unitFor(step.exerciseName))
}

function seedRestConfig() {
  const map = {}
  for (const step of session.value.steps) {
    if (map[step.exerciseName]) continue
    const seconds = step.restSeconds ? Math.max(15, Math.round(step.restSeconds / 15) * 15) : 60
    map[step.exerciseName] = { enabled: false, seconds }
  }
  restByExercise.value = map
}

function restEnabled(exerciseName) {
  return restByExercise.value[exerciseName]?.enabled ?? false
}

function restSecondsFor(exerciseName) {
  return restByExercise.value[exerciseName]?.seconds ?? 60
}

function setRestEnabled(exerciseName, enabled) {
  const cfg = restByExercise.value[exerciseName] ?? { seconds: 60 }
  restByExercise.value = { ...restByExercise.value, [exerciseName]: { ...cfg, enabled } }
}

function adjustRestSeconds(exerciseName, delta) {
  const cfg = restByExercise.value[exerciseName] ?? { enabled: false, seconds: 60 }
  const seconds = Math.max(15, cfg.seconds + delta)
  restByExercise.value = { ...restByExercise.value, [exerciseName]: { ...cfg, seconds } }
}

function prefillFromPrevious() {
  for (const step of session.value.steps) {
    if (step.done) continue
    const prev = previousValues.value.get(previousKey(step))
    if (!prev) continue
    if (step.weight == null && prev.weight != null) step.weight = prev.weight
    if (step.metric === 'time') {
      if (step.seconds == null && prev.seconds != null) step.seconds = prev.seconds
    } else if (step.reps == null && prev.reps != null) {
      step.reps = prev.reps
    }
  }
}

async function loadPreviousValues(routineId) {
  const workouts = await getWorkouts()
  const match = workouts.find((w) => w.routineId === routineId)
  const map = new Map()
  if (match) {
    for (const exercise of match.exercises ?? []) {
      ;(exercise.sets ?? []).forEach((set, i) => {
        map.set(`${exercise.name}#${i + 1}`, set)
      })
    }
  }
  previousValues.value = map
}

function weightDisplay(step) {
  if (step.weight == null) return null
  return unitFor(step.exerciseName) === 'lb' ? kgToLb(step.weight) : step.weight
}

function onWeightInput(step, rawValue) {
  const value = rawValue === '' ? null : Number(rawValue)
  step.weight = value == null ? null : unitFor(step.exerciseName) === 'lb' ? lbToKg(value) : value
}

function startElapsedTimer() {
  elapsedTimer = setInterval(() => {
    if (session.value) elapsedMs.value = Date.now() - session.value.startedAt
  }, 1000)
}

function startRest(seconds) {
  clearInterval(restTimer)
  resting.value = true
  restRemaining.value = seconds
  restTimer = setInterval(() => {
    restRemaining.value -= 1
    if (restRemaining.value <= 0) skipRest()
  }, 1000)
}

function skipRest() {
  clearInterval(restTimer)
  resting.value = false
  restRemaining.value = 0
}

async function persist() {
  await updateSessionProgress({ steps: session.value.steps, currentStepIndex: doneSteps.value })
}

async function toggleDone(step) {
  error.value = ''
  const wasDone = step.done
  step.done = !wasDone
  saving.value = true
  try {
    await persist()
    if (!wasDone && restEnabled(step.exerciseName)) startRest(restSecondsFor(step.exerciseName))
  } catch (err) {
    step.done = wasDone
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function finish() {
  saving.value = true
  error.value = ''
  try {
    summary.value = await finishSession(session.value)
    session.value = null
    clearInterval(elapsedTimer)
    clearInterval(restTimer)
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function abandonSession() {
  if (!confirm('¿Descartar este entrenamiento en progreso? No se guardará nada.')) return
  await deleteActiveSession()
  router.push({ name: 'gym-log-rutinas' })
}

onMounted(async () => {
  try {
    session.value = await getActiveSession()
    if (!session.value) {
      error.value = 'No hay ningún entrenamiento activo. Inícialo desde una rutina.'
    } else {
      elapsedMs.value = Date.now() - session.value.startedAt
      startElapsedTimer()
      seedRestConfig()
      await loadPreviousValues(session.value.routineId)
      prefillFromPrevious()
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  clearInterval(elapsedTimer)
  clearInterval(restTimer)
})
</script>

<template>
  <div class="active-session-view">
    <div v-if="loading" class="text-muted">Cargando...</div>

    <div v-else-if="summary" class="summary-panel">
      <h1 class="h4 mb-3"><i class="bi bi-trophy-fill me-2"></i>¡Entrenamiento completado!</h1>
      <div class="stats-row mb-4">
        <div class="stat-card">
          <div class="stat-value">{{ formatElapsed(summary.durationMs) }}</div>
          <div class="stat-label">Duración</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ summary.totalVolume.toLocaleString('es-CR') }}</div>
          <div class="stat-label">Volumen (kg)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ summary.totalReps }}</div>
          <div class="stat-label">Reps totales</div>
        </div>
      </div>
      <div class="d-flex gap-2">
        <RouterLink :to="{ name: 'gym-log-entrenamientos' }" class="btn btn-primary">Ver historial</RouterLink>
        <RouterLink :to="{ name: 'gym-log-dashboard' }" class="btn btn-outline-secondary">Ir al progreso</RouterLink>
      </div>
    </div>

    <div v-else-if="error && !session" class="alert alert-danger">
      {{ error }}
      <div class="mt-2">
        <RouterLink :to="{ name: 'gym-log-rutinas' }" class="btn btn-sm btn-outline-secondary">Ir a Rutinas</RouterLink>
      </div>
    </div>

    <div v-else-if="session" class="session-active">
      <div class="session-header d-flex justify-content-between align-items-center mb-3">
        <div class="fw-semibold">{{ session.routineName }}</div>
        <button type="button" class="btn btn-primary btn-finish" :disabled="saving" @click="finish">
          {{ saving ? 'Guardando...' : 'Terminar' }}
        </button>
      </div>

      <div class="stats-row mb-3">
        <div class="stat-card">
          <div class="stat-value">{{ formatElapsed(elapsedMs) }}</div>
          <div class="stat-label">Duración</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ liveVolume.toLocaleString('es-CR') }}</div>
          <div class="stat-label">Volumen (kg)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ doneSteps }}/{{ totalSteps }}</div>
          <div class="stat-label">Series</div>
        </div>
      </div>

      <div v-if="resting" class="rest-banner">
        <span class="rest-label">Descanso</span>
        <span class="rest-countdown">{{ restRemaining }}s</span>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="skipRest">Saltar</button>
      </div>

      <div v-if="error" class="alert alert-danger mb-3">{{ error }}</div>

      <div v-for="group in groupedExercises" :key="group.exerciseName" class="exercise-card mb-3">
        <div v-if="group.supersetLabel" class="superset-badge">{{ group.supersetLabel }}</div>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h2 class="h6 mb-0">
            {{ group.exerciseName }}
            <a
              v-if="group.videoUrl"
              :href="group.videoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="video-link"
              title="Ver guía en video"
            >
              <i class="bi bi-play-circle-fill"></i>
            </a>
          </h2>
          <div class="unit-toggle" role="group" aria-label="Unidad de peso">
            <button
              type="button"
              class="unit-btn"
              :class="{ active: unitFor(group.exerciseName) === 'kg' }"
              @click="setUnitFor(group.exerciseName, 'kg')"
            >
              kg
            </button>
            <button
              type="button"
              class="unit-btn"
              :class="{ active: unitFor(group.exerciseName) === 'lb' }"
              @click="setUnitFor(group.exerciseName, 'lb')"
            >
              lb
            </button>
          </div>
        </div>

        <div class="rest-config mb-2">
          <i class="bi bi-stopwatch me-1"></i>
          <button
            type="button"
            class="rest-toggle-btn"
            @click="setRestEnabled(group.exerciseName, !restEnabled(group.exerciseName))"
          >
            Descanso: {{ restEnabled(group.exerciseName) ? 'activado' : 'apagado' }}
          </button>
          <template v-if="restEnabled(group.exerciseName)">
            <button type="button" class="rest-step-btn" @click="adjustRestSeconds(group.exerciseName, -15)">
              −15s
            </button>
            <span class="rest-step-value">{{ restSecondsFor(group.exerciseName) }}s</span>
            <button type="button" class="rest-step-btn" @click="adjustRestSeconds(group.exerciseName, 15)">
              +15s
            </button>
          </template>
        </div>

        <div class="sets-table">
          <div class="sets-row sets-header">
            <span>Serie</span>
            <span>Anterior</span>
            <span>{{ group.metric === 'time' ? 'Seg' : 'Reps' }}</span>
            <span>{{ unitFor(group.exerciseName) }}</span>
            <span></span>
          </div>

          <div
            v-for="{ step } in group.items"
            :key="step.setNumber"
            class="sets-row"
            :class="{ 'set-done': step.done }"
          >
            <span class="set-number">{{ step.setNumber }}</span>
            <span class="set-anterior">{{ anteriorLabel(step) }}</span>

            <input
              v-if="step.metric === 'time'"
              v-model.number="step.seconds"
              type="number"
              min="0"
              class="form-control"
              :placeholder="step.targetSeconds ?? ''"
            />
            <input
              v-else
              v-model.number="step.reps"
              type="number"
              min="0"
              class="form-control"
              :placeholder="step.targetReps ?? ''"
            />

            <input
              :value="weightDisplay(step)"
              @input="onWeightInput(step, $event.target.value)"
              type="number"
              min="0"
              step="0.5"
              class="form-control"
            />

            <button
              type="button"
              class="check-btn"
              :class="{ active: step.done }"
              :aria-pressed="step.done"
              @click="toggleDone(step)"
            >
              <i class="bi bi-check-lg"></i>
            </button>
          </div>
        </div>
      </div>

      <button type="button" class="btn btn-link text-danger mt-2 p-0" @click="abandonSession">
        Descartar entrenamiento
      </button>
    </div>
  </div>
</template>

<style scoped>
.session-header {
  position: sticky;
  top: 0;
  background-color: var(--color-background);
  padding-top: 0.25rem;
  z-index: 5;
}

.btn-finish {
  padding: 0.35rem 1.25rem;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.stat-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 0.75rem;
  text-align: center;
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.unit-toggle {
  display: inline-flex;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.unit-btn {
  border: none;
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  cursor: pointer;
}

.unit-btn.active {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.rest-banner {
  position: sticky;
  top: 3rem;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
}

.rest-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.rest-countdown {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-right: auto;
}

.exercise-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.video-link {
  color: var(--color-primary);
  margin-left: 0.35rem;
}

.superset-badge {
  display: inline-block;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-on-primary);
  background-color: var(--color-accent);
  border-radius: var(--radius-full);
  padding: 0.15rem 0.6rem;
  margin-bottom: 0.5rem;
}

.rest-config {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

.rest-toggle-btn {
  border: none;
  background: none;
  padding: 0;
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
}

.rest-step-btn {
  border: 1px solid var(--color-border-strong);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  cursor: pointer;
}

.rest-step-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 2.5rem;
  text-align: center;
}

.sets-table {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.sets-row {
  display: grid;
  grid-template-columns: 1.6rem 4.5rem 1fr 1fr 2.25rem;
  gap: 0.5rem;
  align-items: center;
}

.sets-header {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.set-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: var(--radius-sm);
  background-color: var(--color-background);
  font-weight: 700;
  font-size: var(--font-size-sm);
}

.set-anterior {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.sets-row input.form-control {
  padding: 0.35rem 0.5rem;
  text-align: center;
}

.check-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
}

.check-btn.active {
  background-color: var(--color-success);
  border-color: var(--color-success);
  color: var(--color-on-primary);
}

.set-done input.form-control {
  opacity: 0.7;
}
</style>
