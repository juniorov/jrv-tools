<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { deleteWorkout, getWorkouts } from '../services/entrenamientos'
import { formatDate, parseDateInput } from '../utils/dates'
import { workoutVolume } from '../utils/progress'

const workouts = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  try {
    workouts.value = await getWorkouts()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleDelete(workout) {
  if (!confirm('¿Eliminar este entrenamiento?')) return
  await deleteWorkout(workout.id)
  await load()
}

onMounted(load)
</script>

<template>
  <div class="entrenamientos-view">
    <h1 class="h4 mb-3">Historial de entrenamientos</h1>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="loading" class="text-muted">Cargando...</div>
    <div v-else-if="workouts.length === 0" class="text-muted">
      Todavía no has registrado ningún entrenamiento.
    </div>

    <div v-else class="list-group">
      <div v-for="workout in workouts" :key="workout.id" class="list-group-item workout-item">
        <div>
          <div class="fw-semibold">
            {{ formatDate(parseDateInput(workout.date)) }}
            <span v-if="workout.routineName" class="text-muted"> · {{ workout.routineName }}</span>
          </div>
          <div class="text-muted small">
            {{ workout.exercises.length }} ejercicios · {{ workoutVolume(workout).toLocaleString('es-CR') }} kg
          </div>
        </div>
        <div class="d-flex gap-2">
          <RouterLink
            :to="{ name: 'gym-log-registrar', query: { id: workout.id } }"
            class="btn btn-sm btn-outline-secondary"
          >
            <i class="bi bi-pencil"></i>
          </RouterLink>
          <button type="button" class="btn btn-sm btn-outline-danger" @click="handleDelete(workout)">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workout-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
</style>
