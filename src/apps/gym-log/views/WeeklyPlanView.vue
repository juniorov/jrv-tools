<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getWeekOverrides, getWeeklyPlan, clearWeekOverride, setTemplateDay, setWeekOverride } from '../services/planSemanal'
import { getActiveSession, startSession } from '../services/sesiones'
import { getRoutines } from '../services/rutinas'
import { DAY_LABELS, benchedRoutines, effectiveWeeklyPlan, mondayFirstIndex } from '../utils/weeklyPlan'
import { suggestWeeklyPlan } from '../utils/weeklySuggestion'

const router = useRouter()

const routines = ref([])
const template = ref({})
const overrides = ref({})
const loading = ref(true)
const error = ref('')
const starting = ref(false)
const suggestion = ref(null)
const applyingSuggestion = ref(false)

const todayIndex = mondayFirstIndex()
const plan = computed(() => effectiveWeeklyPlan(template.value, overrides.value))
const benched = computed(() => benchedRoutines(routines.value, template.value))

function routineName(routineId) {
  if (!routineId) return 'Descanso'
  return routines.value.find((r) => r.id === routineId)?.name ?? 'Descanso'
}

async function load() {
  loading.value = true
  try {
    const [loadedRoutines, loadedTemplate, loadedOverrides] = await Promise.all([
      getRoutines(),
      getWeeklyPlan(),
      getWeekOverrides(),
    ])
    routines.value = loadedRoutines
    template.value = loadedTemplate
    overrides.value = loadedOverrides
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleTemplateChange(dayIndex, event) {
  const routineId = event.target.value || null
  try {
    await setTemplateDay(dayIndex, routineId)
    template.value = await getWeeklyPlan()
  } catch (err) {
    error.value = err.message
  }
}

async function handleOverrideChange(dayIndex, event) {
  const routineId = event.target.value
  try {
    if (routineId === '__none__') {
      await clearWeekOverride(dayIndex)
    } else {
      await setWeekOverride(dayIndex, routineId || null)
    }
    overrides.value = await getWeekOverrides()
  } catch (err) {
    error.value = err.message
  }
}

async function handleClearOverride(dayIndex) {
  try {
    await clearWeekOverride(dayIndex)
    overrides.value = await getWeekOverrides()
  } catch (err) {
    error.value = err.message
  }
}

async function assignFromBench(routine, event) {
  const dayIndex = event.target.value
  event.target.value = ''
  if (dayIndex === '') return
  try {
    await setTemplateDay(dayIndex, routine.id)
    template.value = await getWeeklyPlan()
  } catch (err) {
    error.value = err.message
  }
}

function handleSuggest() {
  const fixed = {}
  for (const [dayIndex, routineId] of Object.entries(template.value)) {
    const routine = routines.value.find((r) => r.id === routineId)
    if (routine?.category === 'Natación') fixed[dayIndex] = routineId
  }
  suggestion.value = suggestWeeklyPlan(routines.value, { fixed })
}

function suggestionNoteFor(dayIndex) {
  return suggestion.value?.notes.find((n) => n.dayIndex === dayIndex && n.level === 'warning')
}

function discardSuggestion() {
  suggestion.value = null
}

async function applySuggestion() {
  applyingSuggestion.value = true
  try {
    for (const [dayIndex, routineId] of Object.entries(suggestion.value.assignments)) {
      await setTemplateDay(Number(dayIndex), routineId)
    }
    template.value = await getWeeklyPlan()
    suggestion.value = null
  } catch (err) {
    error.value = err.message
  } finally {
    applyingSuggestion.value = false
  }
}

async function handleStartToday() {
  const todayRow = plan.value[todayIndex]
  const routine = routines.value.find((r) => r.id === todayRow.routineId)
  if (!routine) return

  starting.value = true
  error.value = ''
  try {
    const active = await getActiveSession()
    if (active && !confirm(`Ya tienes un entrenamiento en progreso ("${active.routineName}"). ¿Reemplazarlo?`)) {
      return
    }
    await startSession(routine)
    router.push({ name: 'gym-log-entrenar' })
  } catch (err) {
    error.value = err.message
  } finally {
    starting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="weekly-plan-view">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h4 mb-0">Plan semanal</h1>
      <button type="button" class="btn btn-outline-primary btn-sm" @click="handleSuggest">
        <i class="bi bi-magic me-1"></i>Sugerir orden semanal
      </button>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="loading" class="text-muted">Cargando...</div>

    <template v-else>
      <div v-if="suggestion" class="suggestion-panel mb-3">
        <h2 class="h6 mb-2">Propuesta de orden semanal</h2>
        <ul class="list-unstyled mb-2">
          <li v-for="row in DAY_LABELS" :key="row" class="suggestion-row">
            <span class="fw-semibold">{{ row }}:</span>
            {{ routineName(suggestion.assignments[DAY_LABELS.indexOf(row)]) }}
            <span v-if="suggestionNoteFor(DAY_LABELS.indexOf(row))" class="text-warning small ms-1">
              <i class="bi bi-exclamation-triangle"></i>
              {{ suggestionNoteFor(DAY_LABELS.indexOf(row)).message }}
            </span>
          </li>
        </ul>
        <p v-for="note in suggestion.notes.filter((n) => n.dayIndex === null)" :key="note.message" class="text-muted small mb-1">
          <i class="bi bi-info-circle me-1"></i>{{ note.message }}
        </p>
        <div class="mt-2">
          <button type="button" class="btn btn-primary btn-sm me-2" :disabled="applyingSuggestion" @click="applySuggestion">
            {{ applyingSuggestion ? 'Aplicando...' : 'Aplicar a la plantilla' }}
          </button>
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="discardSuggestion">Descartar</button>
        </div>
      </div>

      <div v-for="row in plan" :key="row.dayIndex" class="day-row" :class="{ 'day-row-today': row.dayIndex === todayIndex }">
        <div class="day-header">
          <span class="day-label">{{ row.label }}</span>
          <span v-if="row.dayIndex === todayIndex" class="today-badge">Hoy</span>
        </div>

        <div class="day-body">
          <div class="routine-name">{{ routineName(row.routineId) }}</div>
          <div v-if="row.isOverridden" class="override-hint">
            plantilla: {{ routineName(row.templateRoutineId) }}
            <button type="button" class="btn btn-link btn-sm p-0 ms-1" @click="handleClearOverride(row.dayIndex)">
              Quitar cambio
            </button>
          </div>
        </div>

        <div class="day-controls">
          <div class="control-group">
            <label class="form-label">Plantilla</label>
            <select class="form-select form-select-sm" :value="row.templateRoutineId ?? ''" @change="handleTemplateChange(row.dayIndex, $event)">
              <option value="">Descanso</option>
              <option v-for="r in routines" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
          <div class="control-group">
            <label class="form-label">Solo esta semana</label>
            <select class="form-select form-select-sm" :value="row.isOverridden ? row.routineId ?? '' : '__none__'" @change="handleOverrideChange(row.dayIndex, $event)">
              <option value="__none__">— sin cambio —</option>
              <option value="">Descanso</option>
              <option v-for="r in routines" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
        </div>

        <button
          v-if="row.dayIndex === todayIndex && row.routineId"
          type="button"
          class="btn btn-primary btn-sm mt-2"
          :disabled="starting"
          @click="handleStartToday"
        >
          <i class="bi bi-play-fill me-1"></i>Iniciar entrenamiento
        </button>
      </div>

      <div class="bench-section">
        <h2 class="h6 mt-4 mb-2">Banca</h2>
        <p class="text-muted small" v-if="benched.length === 0">
          Todas tus rutinas están asignadas a algún día.
        </p>
        <div v-else class="list-group">
          <div v-for="routine in benched" :key="routine.id" class="list-group-item bench-item">
            <span>{{ routine.name }}</span>
            <select class="form-select form-select-sm bench-select" @change="assignFromBench(routine, $event)">
              <option value="">Asignar a un día...</option>
              <option v-for="row in plan" :key="row.dayIndex" :value="row.dayIndex">{{ row.label }}</option>
            </select>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.suggestion-panel {
  background-color: var(--color-surface);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-lg);
  padding: 0.75rem 1rem;
}

.suggestion-row {
  padding: 0.15rem 0;
}

.day-row {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}

.day-row-today {
  border-color: var(--color-primary);
}

.day-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.day-label {
  font-weight: 600;
}

.today-badge {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-on-primary);
  background-color: var(--color-primary);
  border-radius: var(--radius-full);
  padding: 0.1rem 0.5rem;
}

.routine-name {
  font-size: var(--font-size-lg);
}

.override-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.day-controls {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.control-group {
  flex: 1;
}

.bench-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.bench-select {
  max-width: 12rem;
}
</style>
