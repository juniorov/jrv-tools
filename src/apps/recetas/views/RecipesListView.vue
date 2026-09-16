<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { deleteRecipe, getRecipes } from '../services/recipes'

const recipes = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  try {
    recipes.value = await getRecipes()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleDelete(recipe) {
  if (!confirm(`¿Eliminar la receta "${recipe.name}"?`)) return
  try {
    await deleteRecipe(recipe.id)
    recipes.value = recipes.value.filter((r) => r.id !== recipe.id)
  } catch (err) {
    error.value = err.message
  }
}

function yieldLabel(recipe) {
  return `${recipe.yieldValue} ${recipe.yieldUnit}`
}

onMounted(load)
</script>

<template>
  <div class="recipes-list-view">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h4 mb-0">Recetario</h1>
      <RouterLink :to="{ name: 'recetas-nueva' }" class="btn btn-primary btn-sm">
        <i class="bi bi-plus-lg me-1"></i>Nueva receta
      </RouterLink>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="loading" class="text-muted">Cargando...</div>
    <div v-else-if="recipes.length === 0" class="text-muted">
      Todavía no cargaste ninguna receta.
    </div>

    <ul v-else class="list-group">
      <li v-for="recipe in recipes" :key="recipe.id" class="list-group-item d-flex justify-content-between align-items-center">
        <RouterLink :to="{ name: 'recetas-detalle', params: { id: recipe.id } }" class="recipe-link">
          <span class="fw-semibold">{{ recipe.name }}</span>
          <span class="text-muted ms-2">{{ yieldLabel(recipe) }} · {{ recipe.ingredients.length }} ingredientes</span>
        </RouterLink>
        <div class="d-flex gap-2">
          <RouterLink :to="{ name: 'recetas-editar', params: { id: recipe.id } }" class="btn btn-outline-secondary btn-sm">
            <i class="bi bi-pencil"></i>
          </RouterLink>
          <button type="button" class="btn btn-outline-danger btn-sm" @click="handleDelete(recipe)">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.recipe-link {
  text-decoration: none;
  color: inherit;
}
</style>
