<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IngredientRows from '../components/IngredientRows.vue'
import { createRecipe, getRecipe, updateRecipe } from '../services/recipes'
import { FITNESS_GOALS, MEAL_TYPES, RECIPE_TYPES } from '../utils/recipeTags'

const route = useRoute()
const router = useRouter()

const isEditing = computed(() => Boolean(route.params.id))

const loading = ref(false)
const saving = ref(false)
const error = ref('')

const name = ref('')
const description = ref('')
const stepsText = ref('')
const tagsText = ref('')
const mealTypes = ref([])
const goals = ref([])
const recipeType = ref('')
const yieldType = ref('servings')
const yieldValue = ref(null)
const yieldUnit = ref('')
const ingredients = ref([{ name: '', quantity: null, unit: '' }])

async function load() {
  if (!isEditing.value) return
  loading.value = true
  try {
    const recipe = await getRecipe(route.params.id)
    if (!recipe) {
      error.value = 'La receta no existe'
      return
    }
    name.value = recipe.name
    description.value = recipe.description || ''
    stepsText.value = (recipe.steps || []).join('\n')
    tagsText.value = (recipe.tags || []).join(', ')
    mealTypes.value = recipe.mealTypes || []
    goals.value = recipe.goals || []
    recipeType.value = recipe.recipeType || ''
    yieldType.value = recipe.yieldType
    yieldValue.value = recipe.yieldValue
    yieldUnit.value = recipe.yieldType === 'amount' ? recipe.yieldUnit : ''
    ingredients.value = recipe.ingredients.map((ing) => ({ ...ing }))
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function validate() {
  if (!name.value.trim()) return 'El nombre es obligatorio'
  if (!yieldValue.value || yieldValue.value <= 0) return 'El rendimiento debe ser mayor a 0'
  if (yieldType.value === 'amount' && !yieldUnit.value.trim()) return 'Indicá la unidad del rendimiento'
  const validIngredients = ingredients.value.filter((ing) => ing.name.trim() && ing.quantity != null && ing.quantity > 0)
  if (validIngredients.length === 0) return 'Agregá al menos un ingrediente con cantidad'
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
      name: name.value.trim(),
      description: description.value.trim(),
      steps: stepsText.value.split('\n').map((s) => s.trim()).filter(Boolean),
      tags: tagsText.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      mealTypes: mealTypes.value,
      goals: goals.value,
      recipeType: recipeType.value,
      yieldType: yieldType.value,
      yieldValue: Number(yieldValue.value),
      yieldUnit: yieldType.value === 'amount' ? yieldUnit.value.trim() : 'porciones',
      ingredients: ingredients.value
        .filter((ing) => ing.name.trim() && ing.quantity != null && ing.quantity > 0)
        .map((ing) => ({ name: ing.name.trim(), quantity: Number(ing.quantity), unit: ing.unit.trim() })),
    }
    if (isEditing.value) {
      await updateRecipe(route.params.id, payload)
      router.push({ name: 'recetas-detalle', params: { id: route.params.id } })
    } else {
      const id = await createRecipe(payload)
      router.push({ name: 'recetas-detalle', params: { id } })
    }
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="recipe-form-view">
    <h1 class="h4 mb-3">{{ isEditing ? 'Editar receta' : 'Nueva receta' }}</h1>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="loading" class="text-muted">Cargando...</div>

    <form v-else @submit.prevent="save">
      <div class="mb-3">
        <label class="form-label">Nombre</label>
        <input v-model="name" type="text" class="form-control" required />
      </div>

      <div class="mb-3">
        <label class="form-label">Descripción</label>
        <textarea v-model="description" class="form-control" rows="2"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label">Etiquetas (separadas por coma)</label>
        <input v-model="tagsText" type="text" class="form-control" placeholder="panadería, sin lácteos" />
      </div>

      <div class="mb-3">
        <label class="form-label">Clasificación</label>
        <select v-model="recipeType" class="form-select">
          <option value="">Sin clasificar</option>
          <option v-for="rt in RECIPE_TYPES" :key="rt" :value="rt">{{ rt }}</option>
        </select>
        <div class="form-text">Solo las recetas marcadas como "Platillo" aparecen en el menú semanal.</div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-6">
          <label class="form-label d-block">Tipo de comida</label>
          <div v-for="mt in MEAL_TYPES" :key="mt" class="form-check form-check-inline">
            <input :id="`mealType-${mt}`" v-model="mealTypes" class="form-check-input" type="checkbox" :value="mt" />
            <label class="form-check-label" :for="`mealType-${mt}`">{{ mt }}</label>
          </div>
        </div>
        <div class="col-6">
          <label class="form-label d-block">Objetivos</label>
          <div v-for="g in FITNESS_GOALS" :key="g" class="form-check">
            <input :id="`goal-${g}`" v-model="goals" class="form-check-input" type="checkbox" :value="g" />
            <label class="form-check-label" :for="`goal-${g}`">{{ g }}</label>
          </div>
        </div>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-6">
          <label class="form-label">Rinde por</label>
          <select v-model="yieldType" class="form-select">
            <option value="servings">Porciones</option>
            <option value="amount">Cantidad total</option>
          </select>
        </div>
        <div class="col-3">
          <label class="form-label">Valor</label>
          <input v-model.number="yieldValue" type="number" min="0" step="any" class="form-control" required />
        </div>
        <div v-if="yieldType === 'amount'" class="col-3">
          <label class="form-label">Unidad</label>
          <input v-model="yieldUnit" type="text" class="form-control" placeholder="g, ml..." required />
        </div>
      </div>

      <h2 class="h6 mt-4 mb-2">Ingredientes</h2>
      <IngredientRows v-model="ingredients" />

      <div class="mb-3 mt-4">
        <label class="form-label">Pasos (uno por línea)</label>
        <textarea v-model="stepsText" class="form-control" rows="5"></textarea>
      </div>

      <div>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </form>
  </div>
</template>
