<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRoutine, updateRoutine } from '../services/rutinas'
import { ROUTINE_CATEGORIES, normalizeCategory } from '../utils/routineCategories'

const route = useRoute()
const router = useRouter()

const routine = ref(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    routine.value = await getRoutine(route.params.id)
    if (!routine.value) error.value = 'La rutina no existe'
    else routine.value.category = normalizeCategory(routine.value.category)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function addExercise() {
  routine.value.exercises.push({
    name: '',
    muscleGroup: '',
    metric: 'reps',
    targetSets: null,
    targetReps: '',
    targetSeconds: null,
    restSeconds: null,
    supersetGroup: null,
    notes: '',
  })
}

function setMetric(exercise, metric) {
  exercise.metric = metric
  if (metric === 'reps') exercise.targetSeconds = null
  else exercise.targetReps = ''
}

function removeExercise(index) {
  routine.value.exercises.splice(index, 1)
}

// Colores para la barra que marca visualmente los ejercicios agrupados en superset (igual que
// la barra de color de Hevy), asignados de forma estable según el valor de supersetGroup.
const SUPERSET_COLORS = ['#7c3aed', '#0d9488', '#d97706', '#2563eb', '#db2777']

function supersetColor(group) {
  if (!group) return null
  let hash = 0
  for (const char of group) hash = (hash * 31 + char.charCodeAt(0)) % SUPERSET_COLORS.length
  return SUPERSET_COLORS[hash]
}

async function save() {
  saving.value = true
  try {
    await updateRoutine(routine.value.id, {
      name: routine.value.name,
      description: routine.value.description,
      exercises: routine.value.exercises,
      category: routine.value.category,
    })
    router.push({ name: 'gym-log-rutinas' })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="rutina-detail-view">
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="loading" class="text-muted">Cargando...</div>

    <form v-else @submit.prevent="save">
      <div class="mb-3">
        <label class="form-label">Nombre</label>
        <input v-model="routine.name" type="text" class="form-control" required />
      </div>

      <div class="mb-3">
        <label class="form-label">Descripción</label>
        <textarea v-model="routine.description" class="form-control" rows="2"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label">Categoría</label>
        <select v-model="routine.category" class="form-select">
          <option v-for="c in ROUTINE_CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <h2 class="h6 mt-4 mb-2">Ejercicios</h2>
      <div
        v-for="(exercise, index) in routine.exercises"
        :key="index"
        class="exercise-card mb-3"
        :style="{ borderLeftColor: supersetColor(exercise.supersetGroup) || 'var(--color-border)' }"
      >
        <div class="row g-2">
          <div class="col-12 col-md-4">
            <input v-model="exercise.name" type="text" class="form-control" placeholder="Nombre" required />
          </div>
          <div class="col-6 col-md-2">
            <input v-model="exercise.muscleGroup" type="text" class="form-control" placeholder="Grupo muscular" />
          </div>
          <div class="col-4 col-md-2">
            <select
              class="form-select"
              :value="exercise.metric"
              @change="setMetric(exercise, $event.target.value)"
            >
              <option value="reps">Repeticiones</option>
              <option value="time">Tiempo</option>
            </select>
          </div>
          <div class="col-4 col-md-2">
            <input v-model.number="exercise.targetSets" type="number" min="0" class="form-control" placeholder="Sets" />
          </div>
          <div class="col-4 col-md-2">
            <input
              v-if="exercise.metric === 'time'"
              v-model.number="exercise.targetSeconds"
              type="number"
              min="0"
              class="form-control"
              placeholder="Segundos"
            />
            <input v-else v-model="exercise.targetReps" type="text" class="form-control" placeholder="Reps" />
          </div>
          <div class="col-4 col-md-2">
            <input
              v-model.number="exercise.restSeconds"
              type="number"
              min="0"
              class="form-control"
              placeholder="Descanso (seg)"
            />
          </div>
          <div class="col-4 col-md-2">
            <input
              v-model="exercise.supersetGroup"
              type="text"
              class="form-control"
              placeholder="Grupo (superset)"
            />
          </div>
          <div class="col-4 col-md-2 d-flex align-items-start">
            <button type="button" class="btn btn-outline-danger w-100" @click="removeExercise(index)">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <button type="button" class="btn btn-outline-secondary btn-sm mb-4" @click="addExercise">
        <i class="bi bi-plus-lg me-1"></i>Agregar ejercicio
      </button>

      <div>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.exercise-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.75rem;
}
</style>
