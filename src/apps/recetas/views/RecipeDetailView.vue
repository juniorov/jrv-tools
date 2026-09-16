<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { deleteRecipe, getRecipe } from '../services/recipes'
import { scaleIngredients } from '../utils/scaling'

const route = useRoute()
const router = useRouter()

const recipe = ref(null)
const loading = ref(true)
const error = ref('')
const targetAmount = ref(null)

async function load() {
  loading.value = true
  try {
    recipe.value = await getRecipe(route.params.id)
    if (!recipe.value) {
      error.value = 'La receta no existe'
      return
    }
    targetAmount.value = recipe.value.yieldValue
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const scaledIngredients = computed(() => {
  if (!recipe.value) return []
  return scaleIngredients(recipe.value, targetAmount.value)
})

const targetLabel = computed(() =>
  recipe.value?.yieldType === 'servings' ? '¿Cuántas porciones querés?' : `¿Cuánta cantidad querés (${recipe.value?.yieldUnit})?`
)

async function handleDelete() {
  if (!recipe.value || !confirm(`¿Eliminar la receta "${recipe.value.name}"?`)) return
  try {
    await deleteRecipe(recipe.value.id)
    router.push({ name: 'recetas-lista' })
  } catch (err) {
    error.value = err.message
  }
}

onMounted(load)
</script>

<template>
  <div class="recipe-detail-view">
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="loading" class="text-muted">Cargando...</div>

    <div v-else>
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h1 class="h4 mb-0">{{ recipe.name }}</h1>
        <div class="d-flex gap-2">
          <RouterLink :to="{ name: 'recetas-editar', params: { id: recipe.id } }" class="btn btn-outline-secondary btn-sm">
            <i class="bi bi-pencil"></i>
          </RouterLink>
          <button type="button" class="btn btn-outline-danger btn-sm" @click="handleDelete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>

      <p v-if="recipe.description" class="text-muted">{{ recipe.description }}</p>

      <div v-if="recipe.tags?.length" class="mb-3">
        <span v-for="tag in recipe.tags" :key="tag" class="badge text-bg-light me-1">{{ tag }}</span>
      </div>

      <div class="mb-4">
        <label class="form-label">{{ targetLabel }}</label>
        <input v-model.number="targetAmount" type="number" min="0" step="any" class="form-control" style="max-width: 200px" />
      </div>

      <h2 class="h6 mb-2">Ingredientes</h2>
      <ul class="list-group mb-4">
        <li v-for="(ing, index) in scaledIngredients" :key="index" class="list-group-item">
          {{ ing.quantity }} {{ ing.unit }} de {{ ing.name }}
        </li>
      </ul>

      <template v-if="recipe.steps?.length">
        <h2 class="h6 mb-2">Preparación</h2>
        <ol>
          <li v-for="(step, index) in recipe.steps" :key="index">{{ step }}</li>
        </ol>
      </template>
    </div>
  </div>
</template>
