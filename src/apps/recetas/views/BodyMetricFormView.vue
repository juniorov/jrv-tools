<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createBodyMetric, getBodyMetric, updateBodyMetric } from '../services/bodyMetrics'
import { computeBmi } from '../utils/bodyMetrics'
import { todayInputValue } from '../utils/dates'

const DEFAULT_HEIGHT_CM = 168

const route = useRoute()
const router = useRouter()

const isEditing = computed(() => Boolean(route.params.id))

const loading = ref(false)
const saving = ref(false)
const error = ref('')

const date = ref(todayInputValue())
const weightKg = ref(null)
const bodyFatPercent = ref(null)
const bodyFatKg = ref(null)
const visceralFat = ref(null)
const muscleMassKg = ref(null)
const waistCm = ref(null)
const bmi = ref(null)

async function load() {
  if (!isEditing.value) return
  loading.value = true
  try {
    const entry = await getBodyMetric(route.params.id)
    if (!entry) {
      error.value = 'La medición no existe'
      return
    }
    date.value = entry.date
    weightKg.value = entry.weightKg
    bodyFatPercent.value = entry.bodyFatPercent
    bodyFatKg.value = entry.bodyFatKg
    visceralFat.value = entry.visceralFat
    muscleMassKg.value = entry.muscleMassKg
    waistCm.value = entry.waistCm
    bmi.value = entry.bmi
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function handleComputeBmi() {
  const computed = computeBmi(weightKg.value, DEFAULT_HEIGHT_CM)
  if (computed != null) bmi.value = computed
}

function validate() {
  if (!date.value) return 'La fecha es obligatoria'
  if (!weightKg.value || weightKg.value <= 0) return 'El peso debe ser mayor a 0'
  return ''
}

async function save() {
  const validationError = validate()
  if (validationError) {
    error.value = validationError
    return
  }
  error.value = ''
  saving.value = true
  try {
    const payload = {
      date: date.value,
      weightKg: Number(weightKg.value),
      bodyFatPercent: bodyFatPercent.value != null ? Number(bodyFatPercent.value) : null,
      bodyFatKg: bodyFatKg.value != null ? Number(bodyFatKg.value) : null,
      visceralFat: visceralFat.value != null ? Number(visceralFat.value) : null,
      muscleMassKg: muscleMassKg.value != null ? Number(muscleMassKg.value) : null,
      waistCm: waistCm.value != null ? Number(waistCm.value) : null,
      bmi: bmi.value != null ? Number(bmi.value) : null,
    }
    if (isEditing.value) {
      await updateBodyMetric(route.params.id, payload)
    } else {
      await createBodyMetric(payload)
    }
    router.push({ name: 'recetas-progreso' })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="body-metric-form-view">
    <h1 class="h4 mb-3">{{ isEditing ? 'Editar medición' : 'Nueva medición' }}</h1>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="loading" class="text-muted">Cargando...</div>

    <form v-else @submit.prevent="save">
      <div class="row g-2 mb-3">
        <div class="col-6">
          <label class="form-label">Fecha</label>
          <input v-model="date" type="date" class="form-control" required />
        </div>
        <div class="col-6">
          <label class="form-label">Peso (kg)</label>
          <input v-model.number="weightKg" type="number" min="0" step="any" class="form-control" required />
        </div>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-6">
          <label class="form-label">% Grasa</label>
          <input v-model.number="bodyFatPercent" type="number" min="0" step="any" class="form-control" />
        </div>
        <div class="col-6">
          <label class="form-label">Grasa (kg)</label>
          <input v-model.number="bodyFatKg" type="number" min="0" step="any" class="form-control" />
        </div>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-6">
          <label class="form-label">Visceral</label>
          <input v-model.number="visceralFat" type="number" min="0" step="any" class="form-control" />
        </div>
        <div class="col-6">
          <label class="form-label">Músculo (kg)</label>
          <input v-model.number="muscleMassKg" type="number" min="0" step="any" class="form-control" />
        </div>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-6">
          <label class="form-label">Cintura (cm)</label>
          <input v-model.number="waistCm" type="number" min="0" step="any" class="form-control" />
        </div>
        <div class="col-6">
          <label class="form-label">IMC</label>
          <div class="input-group">
            <input v-model.number="bmi" type="number" min="0" step="any" class="form-control" />
            <button type="button" class="btn btn-outline-secondary" @click="handleComputeBmi">Calcular</button>
          </div>
        </div>
      </div>

      <div>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </form>
  </div>
</template>
