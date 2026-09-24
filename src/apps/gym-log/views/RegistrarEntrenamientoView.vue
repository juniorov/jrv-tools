<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getWorkout, logWorkout, updateWorkout } from '../services/entrenamientos'
import { getRoutines } from '../services/rutinas'
import { todayInputValue } from '../utils/dates'
import { kgToLb, lbToKg } from '../utils/units'

const router = useRouter()
const route = useRoute()
const editingId = computed(() => route.query.id || null)

const routines = ref([])
const selectedRoutineId = ref('')
const date = ref(todayInputValue())
const notes = ref('')
const exercises = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const selectedRoutine = computed(() => routines.value.find((r) => r.id === selectedRoutineId.value) ?? null)

function blankSet(metric) {
  const base = { weight: null, unit: 'kg' }
  return metric === 'time' ? { ...base, seconds: null } : { ...base, reps: null }
}

function displayWeight(set) {
  if (set.weight == null) return null
  return set.unit === 'lb' ? kgToLb(set.weight) : set.weight
}

function onWeightInput(set, rawValue) {
  const value = rawValue === '' ? null : Number(rawValue)
  set.weight = value == null ? null : set.unit === 'lb' ? lbToKg(value) : value
}

function exercisesFromRoutine(routine) {
  return routine.exercises.map((ex) => ({
    name: ex.name,
    metric: ex.metric ?? 'reps',
    sets: Array.from({ length: ex.targetSets || 1 }, () => blankSet(ex.metric)),
  }))
}

function loadFromRoutine() {
  exercises.value = selectedRoutine.value ? exercisesFromRoutine(selectedRoutine.value) : []
}

const originalWorkout = ref(null)

function hydrateSetForEdit(set) {
  return { ...set, unit: 'kg' }
}

async function loadForEdit(id) {
  const workout = await getWorkout(id)
  if (!workout) {
    error.value = 'El entrenamiento no existe'
    return
  }
  originalWorkout.value = { routineId: workout.routineId ?? null, routineName: workout.routineName ?? '' }
  date.value = workout.date
  notes.value = workout.notes ?? ''
  exercises.value = workout.exercises.map((exercise) => ({
    name: exercise.name,
    metric: exercise.metric ?? 'reps',
    sets: exercise.sets.map(hydrateSetForEdit),
  }))
}

function addFreeExercise() {
  exercises.value.push({ name: '', metric: 'reps', sets: [blankSet('reps')] })
}

function removeExercise(index) {
  exercises.value.splice(index, 1)
}

function setExerciseMetric(exercise, metric) {
  exercise.metric = metric
  exercise.sets = exercise.sets.map(() => blankSet(metric))
}

function addSet(exercise) {
  exercise.sets.push(blankSet(exercise.metric))
}

function removeSet(exercise, setIndex) {
  exercise.sets.splice(setIndex, 1)
}

async function save() {
  if (exercises.value.length === 0) {
    error.value = 'Agrega al menos un ejercicio'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const exercisesInKg = exercises.value.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map(({ unit, ...set }) => set),
    }))
    if (editingId.value) {
      await updateWorkout(editingId.value, {
        date: date.value,
        routineId: originalWorkout.value.routineId,
        routineName: originalWorkout.value.routineName,
        exercises: exercisesInKg,
        notes: notes.value,
      })
    } else {
      await logWorkout({
        date: date.value,
        routineId: selectedRoutine.value?.id ?? null,
        routineName: selectedRoutine.value?.name ?? '',
        exercises: exercisesInKg,
        notes: notes.value,
      })
    }
    router.push({ name: 'gym-log-entrenamientos' })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    routines.value = await getRoutines()
    if (editingId.value) await loadForEdit(editingId.value)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="registrar-view">
    <h1 class="h4 mb-3">{{ editingId ? 'Editar entrenamiento' : 'Registrar entrenamiento' }}</h1>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="loading" class="text-muted">Cargando...</div>

    <form v-else @submit.prevent="save">
      <div class="row g-3 mb-3">
        <div class="col-12 col-md-6">
          <label class="form-label">Fecha</label>
          <input v-model="date" type="date" class="form-control" required />
        </div>
        <div v-if="!editingId" class="col-12 col-md-6">
          <label class="form-label">Rutina (opcional)</label>
          <select v-model="selectedRoutineId" class="form-select" @change="loadFromRoutine">
            <option value="">Entrenamiento libre</option>
            <option v-for="r in routines" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
      </div>

      <div v-for="(exercise, exIndex) in exercises" :key="exIndex" class="exercise-block mb-3">
        <div class="d-flex gap-2 mb-2">
          <input v-model="exercise.name" type="text" class="form-control" placeholder="Ejercicio" required />
          <select
            class="form-select metric-select"
            :value="exercise.metric"
            @change="setExerciseMetric(exercise, $event.target.value)"
          >
            <option value="reps">Reps</option>
            <option value="time">Tiempo</option>
          </select>
          <button type="button" class="btn btn-outline-danger" @click="removeExercise(exIndex)">
            <i class="bi bi-trash"></i>
          </button>
        </div>

        <div v-for="(set, setIndex) in exercise.sets" :key="setIndex" class="set-row mb-2">
          <span class="set-number">Serie {{ setIndex + 1 }}</span>
          <input
            v-if="exercise.metric === 'time'"
            v-model.number="set.seconds"
            type="number"
            min="0"
            class="form-control"
            placeholder="Segundos"
          />
          <input v-else v-model.number="set.reps" type="number" min="0" class="form-control" placeholder="Reps" />
          <div class="weight-input-group">
            <input
              :value="displayWeight(set)"
              @input="onWeightInput(set, $event.target.value)"
              type="number"
              min="0"
              step="0.5"
              class="form-control"
              placeholder="Peso"
            />
            <select v-model="set.unit" class="form-select unit-select">
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="removeSet(exercise, setIndex)">
            <i class="bi bi-x"></i>
          </button>
        </div>
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="addSet(exercise)">
          <i class="bi bi-plus-lg me-1"></i>Agregar serie
        </button>
      </div>

      <button type="button" class="btn btn-outline-primary btn-sm mb-3" @click="addFreeExercise">
        <i class="bi bi-plus-lg me-1"></i>Agregar ejercicio
      </button>

      <div class="mb-3">
        <label class="form-label">Notas</label>
        <textarea v-model="notes" class="form-control" rows="2"></textarea>
      </div>

      <button type="submit" class="btn btn-primary" :disabled="saving">
        {{ saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar entrenamiento' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.exercise-block {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.75rem;
}

.set-row {
  display: grid;
  grid-template-columns: auto 1fr 1.4fr auto;
  gap: 0.5rem;
  align-items: center;
}

.weight-input-group {
  display: flex;
  gap: 0.3rem;
}

.unit-select {
  flex: 0 0 4rem;
  padding-left: 0.4rem;
  padding-right: 0.25rem;
}

.set-number {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.metric-select {
  max-width: 8rem;
  flex: 0 0 auto;
}
</style>
