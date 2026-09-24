<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getRecipes } from '../services/recipes'
import {
  clearWeekMenuOverride,
  getWeekMenuOverrides,
  getWeeklyMenu,
  setTemplateSlot,
  setWeekMenuOverride,
} from '../services/weeklyMenu'
import { FITNESS_GOALS, isPlatillo } from '../utils/recipeTags'
import { DAY_LABELS, MEAL_SLOTS, benchedRecipesForSlot, effectiveWeeklyMenu, mondayFirstIndex } from '../utils/weeklyMenu'
import { suggestWeeklyMenu } from '../utils/weeklyMenuSuggestion'

const recipes = ref([])
const template = ref({})
const overrides = ref({})
const loading = ref(true)
const error = ref('')
const goal = ref('Cualquiera')
const suggestion = ref(null)
const applyingSuggestion = ref(false)

const todayIndex = mondayFirstIndex()
const plan = computed(() => effectiveWeeklyMenu(template.value, overrides.value))
// El menú semanal solo se arma con recetas clasificadas como "Platillo" (ver RecipeFormView):
// marinadas/adobos u otras recetas sin clasificar no aparecen como opción acá.
const platilloRecipes = computed(() => recipes.value.filter(isPlatillo))
const benchedBySlot = computed(() =>
  MEAL_SLOTS.map((slot) => ({
    slot,
    recipes: benchedRecipesForSlot(platilloRecipes.value, template.value, slot.mealType, goal.value),
  })),
)

function recipeName(recipeId) {
  if (!recipeId) return 'Sin asignar'
  return recipes.value.find((r) => r.id === recipeId)?.name ?? 'Sin asignar'
}

async function load() {
  loading.value = true
  try {
    const [loadedRecipes, loadedTemplate, loadedOverrides] = await Promise.all([
      getRecipes(),
      getWeeklyMenu(),
      getWeekMenuOverrides(),
    ])
    recipes.value = loadedRecipes
    template.value = loadedTemplate
    overrides.value = loadedOverrides
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleTemplateChange(dayIndex, slotKey, event) {
  const recipeId = event.target.value || null
  try {
    await setTemplateSlot(dayIndex, slotKey, recipeId)
    template.value = await getWeeklyMenu()
  } catch (err) {
    error.value = err.message
  }
}

async function handleOverrideChange(dayIndex, slotKey, event) {
  const recipeId = event.target.value
  try {
    if (recipeId === '__none__') {
      await clearWeekMenuOverride(dayIndex, slotKey)
    } else {
      await setWeekMenuOverride(dayIndex, slotKey, recipeId || null)
    }
    overrides.value = await getWeekMenuOverrides()
  } catch (err) {
    error.value = err.message
  }
}

async function handleClearOverride(dayIndex, slotKey) {
  try {
    await clearWeekMenuOverride(dayIndex, slotKey)
    overrides.value = await getWeekMenuOverrides()
  } catch (err) {
    error.value = err.message
  }
}

async function assignFromBench(recipe, slotKey, event) {
  const dayIndex = event.target.value
  event.target.value = ''
  if (dayIndex === '') return
  try {
    await setTemplateSlot(dayIndex, slotKey, recipe.id)
    template.value = await getWeeklyMenu()
  } catch (err) {
    error.value = err.message
  }
}

function handleSuggest() {
  suggestion.value = suggestWeeklyMenu(platilloRecipes.value, { goal: goal.value })
}

function suggestionNoteFor(dayIndex, slotKey) {
  return suggestion.value?.notes.find((n) => n.dayIndex === dayIndex && n.slotKey === slotKey && n.level === 'warning')
}

function discardSuggestion() {
  suggestion.value = null
}

async function applySuggestion() {
  applyingSuggestion.value = true
  try {
    for (const [dayIndex, slots] of Object.entries(suggestion.value.assignments)) {
      for (const [slotKey, recipeId] of Object.entries(slots)) {
        await setTemplateSlot(Number(dayIndex), slotKey, recipeId)
      }
    }
    template.value = await getWeeklyMenu()
    suggestion.value = null
  } catch (err) {
    error.value = err.message
  } finally {
    applyingSuggestion.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="weekly-menu-view">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="h4 mb-0">Menú semanal</h1>
      <div class="d-flex gap-2 align-items-center">
        <select v-model="goal" class="form-select form-select-sm goal-select">
          <option v-for="g in FITNESS_GOALS" :key="g" :value="g">{{ g }}</option>
        </select>
        <button type="button" class="btn btn-outline-primary btn-sm" @click="handleSuggest">
          <i class="bi bi-magic me-1"></i>Sugerir menú semanal
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="loading" class="text-muted">Cargando...</div>
    <div v-else-if="platilloRecipes.length === 0" class="alert alert-warning">
      No tenés ninguna receta clasificada como "Platillo" todavía. Marcá la clasificación en
      <RouterLink :to="{ name: 'recetas-lista' }">Recetario</RouterLink> para que aparezcan acá.
    </div>

    <template v-else>
      <div v-if="suggestion" class="suggestion-panel mb-3">
        <h2 class="h6 mb-2">Propuesta de menú semanal</h2>
        <ul class="list-unstyled mb-2">
          <li v-for="dayIndex in 7" :key="dayIndex" class="suggestion-row">
            <span class="fw-semibold">{{ DAY_LABELS[dayIndex - 1] }}:</span>
            <span v-for="slot in MEAL_SLOTS" :key="slot.key" class="ms-2">
              {{ slot.label }}: {{ recipeName(suggestion.assignments[dayIndex - 1][slot.key]) }}
              <span v-if="suggestionNoteFor(dayIndex - 1, slot.key)" class="text-warning small ms-1">
                <i class="bi bi-exclamation-triangle"></i>
              </span>
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

        <div v-for="slot in row.slots" :key="slot.key" class="slot-row">
          <div class="slot-body">
            <span class="slot-name">{{ slot.label }}:</span>
            {{ recipeName(slot.recipeId) }}
            <span v-if="slot.isOverridden" class="override-hint">
              plantilla: {{ recipeName(slot.templateRecipeId) }}
              <button type="button" class="btn btn-link btn-sm p-0 ms-1" @click="handleClearOverride(row.dayIndex, slot.key)">
                Quitar cambio
              </button>
            </span>
          </div>

          <div class="slot-controls">
            <div class="control-group">
              <label class="form-label">Plantilla</label>
              <select
                class="form-select form-select-sm"
                :value="slot.templateRecipeId ?? ''"
                @change="handleTemplateChange(row.dayIndex, slot.key, $event)"
              >
                <option value="">Sin asignar</option>
                <option v-for="r in platilloRecipes" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </div>
            <div class="control-group">
              <label class="form-label">Solo esta semana</label>
              <select
                class="form-select form-select-sm"
                :value="slot.isOverridden ? (slot.recipeId ?? '') : '__none__'"
                @change="handleOverrideChange(row.dayIndex, slot.key, $event)"
              >
                <option value="__none__">— sin cambio —</option>
                <option value="">Sin asignar</option>
                <option v-for="r in platilloRecipes" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="bench-section">
        <h2 class="h6 mt-4 mb-2">Banca</h2>
        <div v-for="{ slot, recipes: benchedRecipes } in benchedBySlot" :key="slot.key" class="mb-3">
          <h3 class="h6 text-muted mb-1">{{ slot.label }}</h3>
          <p class="text-muted small" v-if="benchedRecipes.length === 0">
            No hay recetas de {{ slot.label }} disponibles para "{{ goal }}".
          </p>
          <div v-else class="list-group">
            <div v-for="recipe in benchedRecipes" :key="recipe.id" class="list-group-item bench-item">
              <span>{{ recipe.name }}</span>
              <select class="form-select form-select-sm bench-select" @change="assignFromBench(recipe, slot.key, $event)">
                <option value="">Asignar a un día...</option>
                <option v-for="row in plan" :key="row.dayIndex" :value="row.dayIndex">{{ row.label }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.goal-select {
  max-width: 14rem;
}

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
  margin-bottom: 0.5rem;
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

.slot-row {
  padding: 0.5rem 0;
  border-top: 1px dashed var(--color-border);
}

.slot-row:first-of-type {
  border-top: none;
}

.slot-name {
  font-weight: 600;
}

.override-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-left: 0.5rem;
}

.slot-controls {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.35rem;
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
