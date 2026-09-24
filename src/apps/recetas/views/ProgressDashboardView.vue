<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BodyMetricsChart from '../components/BodyMetricsChart.vue'
import { deleteBodyMetric, getBodyMetrics } from '../services/bodyMetrics'
import { deltaFromFirst, latestEntry, sortByDate } from '../utils/bodyMetrics'
import { formatDate } from '../utils/dates'

const METRIC_OPTIONS = [
  { field: 'weightKg', label: 'Peso (kg)' },
  { field: 'bodyFatPercent', label: '% Grasa' },
  { field: 'waistCm', label: 'Cintura (cm)' },
  { field: 'muscleMassKg', label: 'Músculo (kg)' },
]

const entries = ref([])
const loading = ref(true)
const error = ref('')
const selectedMetric = ref(METRIC_OPTIONS[0])

const sortedEntries = computed(() => sortByDate(entries.value).reverse())
const latest = computed(() => latestEntry(entries.value))
const weightDelta = computed(() => deltaFromFirst(entries.value, 'weightKg'))

async function load() {
  loading.value = true
  try {
    entries.value = await getBodyMetrics()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleDelete(entry) {
  if (!confirm(`¿Eliminar la medición del ${formatDate(entry.date + 'T00:00:00')}?`)) return
  try {
    await deleteBodyMetric(entry.id)
    entries.value = entries.value.filter((e) => e.id !== entry.id)
  } catch (err) {
    error.value = err.message
  }
}

function fmt(value, suffix = '') {
  return Number.isFinite(value) ? `${value}${suffix}` : '—'
}

onMounted(load)
</script>

<template>
  <div class="progress-dashboard-view">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="h4 mb-0">Progreso</h1>
      <RouterLink :to="{ name: 'recetas-progreso-nueva' }" class="btn btn-primary btn-sm">
        <i class="bi bi-plus-lg me-1"></i>Nueva medición
      </RouterLink>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="loading" class="text-muted">Cargando...</div>

    <template v-else-if="entries.length === 0">
      <p class="text-muted">Todavía no registraste ninguna medición.</p>
    </template>

    <template v-else>
      <div class="stats-row mb-4">
        <div class="stat-card">
          <div class="stat-value">{{ fmt(latest?.weightKg, ' kg') }}</div>
          <div class="stat-label">Peso actual</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ weightDelta == null ? '—' : `${weightDelta > 0 ? '+' : ''}${weightDelta} kg` }}</div>
          <div class="stat-label">Desde el inicio</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ fmt(latest?.waistCm, ' cm') }}</div>
          <div class="stat-label">Cintura actual</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ fmt(latest?.bmi) }}</div>
          <div class="stat-label">IMC actual</div>
        </div>
      </div>

      <div class="card p-3 mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h2 class="h6 mb-0">Tendencia</h2>
          <select
            class="form-select form-select-sm metric-select"
            :value="selectedMetric.field"
            @change="selectedMetric = METRIC_OPTIONS.find((m) => m.field === $event.target.value)"
          >
            <option v-for="opt in METRIC_OPTIONS" :key="opt.field" :value="opt.field">{{ opt.label }}</option>
          </select>
        </div>
        <BodyMetricsChart :entries="entries" :metric="selectedMetric.field" :label="selectedMetric.label" />
      </div>

      <div class="table-responsive">
        <table class="table table-sm align-middle">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Peso</th>
              <th>%Grasa</th>
              <th>Grasa kg</th>
              <th>Visceral</th>
              <th>Músculo kg</th>
              <th>Cintura</th>
              <th>IMC</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in sortedEntries" :key="entry.id">
              <td>{{ formatDate(entry.date + 'T00:00:00') }}</td>
              <td>{{ fmt(entry.weightKg) }}</td>
              <td>{{ fmt(entry.bodyFatPercent) }}</td>
              <td>{{ fmt(entry.bodyFatKg) }}</td>
              <td>{{ fmt(entry.visceralFat) }}</td>
              <td>{{ fmt(entry.muscleMassKg) }}</td>
              <td>{{ fmt(entry.waistCm) }}</td>
              <td>{{ fmt(entry.bmi) }}</td>
              <td class="d-flex gap-2">
                <RouterLink :to="{ name: 'recetas-progreso-editar', params: { id: entry.id } }" class="btn btn-outline-secondary btn-sm">
                  <i class="bi bi-pencil"></i>
                </RouterLink>
                <button type="button" class="btn btn-outline-danger btn-sm" @click="handleDelete(entry)">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (min-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(4, 1fr);
  }
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

.metric-select {
  max-width: 10rem;
}
</style>
