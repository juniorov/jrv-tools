<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { deleteRecipe, getRecipes, importRecipes } from '../services/recipes'
import { parseRecipesFile } from '../utils/recipeImport'

const recipes = ref([])
const loading = ref(true)
const error = ref('')
const importError = ref('')
const importing = ref(false)
const fileInput = ref(null)

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
    const parsed = parseRecipesFile(text)
    await importRecipes(parsed)
    await load()
  } catch (err) {
    importError.value = err.message
  } finally {
    importing.value = false
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
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="importing" @click="triggerFilePicker">
          <i class="bi bi-upload me-1"></i>{{ importing ? 'Importando...' : 'Importar recetas' }}
        </button>
        <RouterLink :to="{ name: 'recetas-nueva' }" class="btn btn-primary btn-sm">
          <i class="bi bi-plus-lg me-1"></i>Nueva receta
        </RouterLink>
      </div>
      <input ref="fileInput" type="file" accept="application/json" class="d-none" @change="handleFileChange" />
    </div>

    <p class="format-hint text-muted">
      Formato esperado: un archivo <code>.json</code> con
      <code>{ "recetas": [ { "name", "yieldValue", "ingredients": [ { "name", "quantity", "unit" } ] } ] }</code>.
      Para un rendimiento por cantidad total (en vez de porciones) usa
      <code>"yieldType": "amount", "yieldUnit": "g"</code>.
      Agrega <code>"description"</code>, <code>"tags"</code> y <code>"steps"</code> (arreglo de pasos)
      de forma opcional.
    </p>

    <div v-if="importError" class="alert alert-danger">{{ importError }}</div>
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
.format-hint {
  font-size: var(--font-size-sm);
}

.recipe-link {
  text-decoration: none;
  color: inherit;
}
</style>
