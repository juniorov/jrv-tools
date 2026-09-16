<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { deleteRoutine, getRoutines, importRoutines } from '../services/rutinas'
import { getActiveSession, startSession } from '../services/sesiones'
import { parseRoutinesFile } from '../utils/routineImport'

const router = useRouter()

const routines = ref([])
const loading = ref(true)
const error = ref('')
const importError = ref('')
const importing = ref(false)
const fileInput = ref(null)

async function load() {
  loading.value = true
  try {
    routines.value = await getRoutines()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function triggerFilePicker() {
  importError.value = ''
  fileInput.value?.click()
}

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  importing.value = true
  importError.value = ''
  try {
    const text = await file.text()
    const parsed = parseRoutinesFile(text)
    await importRoutines(parsed)
    await load()
  } catch (err) {
    importError.value = err.message
  } finally {
    importing.value = false
  }
}

async function handleDelete(routine) {
  if (!confirm(`¿Eliminar la rutina "${routine.name}"?`)) return
  await deleteRoutine(routine.id)
  await load()
}

async function handleStart(routine) {
  const active = await getActiveSession()
  if (active && !confirm(`Ya tienes un entrenamiento en progreso ("${active.routineName}"). ¿Reemplazarlo?`)) {
    return
  }
  await startSession(routine)
  router.push({ name: 'gym-log-entrenar' })
}

onMounted(load)
</script>

<template>
  <div class="rutinas-view">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h4 mb-0">Rutinas</h1>
      <button type="button" class="btn btn-primary btn-sm" :disabled="importing" @click="triggerFilePicker">
        <i class="bi bi-upload me-1"></i>{{ importing ? 'Importando...' : 'Importar rutinas' }}
      </button>
      <input ref="fileInput" type="file" accept="application/json" class="d-none" @change="handleFileChange" />
    </div>

    <p class="format-hint text-muted">
      Formato esperado: un archivo <code>.json</code> con
      <code>{ "routines": [ { "name", "exercises": [ { "name", "targetSets", "targetReps" } ] } ] }</code>.
      Para ejercicios por tiempo (planchas, calentamientos) usa
      <code>"metric": "time", "targetSeconds": 40</code> en vez de <code>"targetReps"</code>.
      Para armar un superset, agrega <code>"supersetGroup": "A"</code> (el mismo valor) a los
      ejercicios consecutivos que deben hacerse intercalados sin descanso.
      Agrega <code>"category"</code> a la rutina (Piernas, Empuje, Tirón, Full Body, Cardio,
      Natación, Descanso activo u Otro) para que "Sugerir orden semanal" la tenga en cuenta.
    </p>

    <div v-if="importError" class="alert alert-danger">{{ importError }}</div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="loading" class="text-muted">Cargando...</div>
    <div v-else-if="routines.length === 0" class="text-muted">
      Todavía no tienes rutinas. Importa un archivo o créalas manualmente.
    </div>

    <div v-else class="list-group">
      <div v-for="routine in routines" :key="routine.id" class="list-group-item routine-item">
        <RouterLink :to="{ name: 'gym-log-rutina-detail', params: { id: routine.id } }" class="routine-link">
          <div class="fw-semibold">{{ routine.name }}</div>
          <div class="text-muted small">{{ routine.exercises.length }} ejercicios</div>
        </RouterLink>
        <button type="button" class="btn btn-sm btn-primary" @click="handleStart(routine)">
          <i class="bi bi-play-fill me-1"></i>Iniciar
        </button>
        <button type="button" class="btn btn-sm btn-outline-danger" @click="handleDelete(routine)">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.format-hint {
  font-size: var(--font-size-sm);
}

.routine-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.routine-link {
  flex: 1;
  text-decoration: none;
  color: inherit;
}
</style>
