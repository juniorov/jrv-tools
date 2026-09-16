<script setup>
import { computed, onMounted, ref } from 'vue'
import MonthCalendar from '../components/MonthCalendar.vue'
import ProgressChart from '../components/ProgressChart.vue'
import { getWorkouts } from '../services/entrenamientos'
import { workoutDaysSet, workoutVolume } from '../utils/progress'

const workouts = ref([])
const loading = ref(true)
const error = ref('')

const markedDays = computed(() => workoutDaysSet(workouts.value))

const totalWorkouts = computed(() => workouts.value.length)
const totalVolume = computed(() => workouts.value.reduce((sum, w) => sum + workoutVolume(w), 0))
const last7DaysCount = computed(() => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  return workouts.value.filter((w) => new Date(w.date) >= cutoff).length
})

onMounted(async () => {
  try {
    workouts.value = await getWorkouts()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dashboard-view">
    <h1 class="h4 mb-4">Progreso</h1>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="loading" class="text-muted">Cargando...</div>

    <template v-else>
      <div class="stats-row mb-4">
        <div class="stat-card">
          <div class="stat-value">{{ totalWorkouts }}</div>
          <div class="stat-label">Entrenamientos</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ last7DaysCount }}</div>
          <div class="stat-label">Últimos 7 días</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ totalVolume.toLocaleString('es-CR') }}</div>
          <div class="stat-label">Volumen total (kg)</div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-12 col-lg-5">
          <div class="card p-3">
            <MonthCalendar :marked-days="markedDays" />
          </div>
        </div>
        <div class="col-12 col-lg-7">
          <div class="card p-3">
            <ProgressChart :workouts="workouts" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  text-align: center;
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.card {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
</style>
