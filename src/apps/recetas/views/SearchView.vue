<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import IngredientChips from '../components/IngredientChips.vue'
import { getRecipes } from '../services/recipes'
import { filterRecipesByIngredients } from '../utils/matching'

const recipes = ref([])
const loading = ref(true)
const error = ref('')
const onHand = ref([])

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

const results = computed(() => filterRecipesByIngredients(recipes.value, onHand.value))

function yieldLabel(recipe) {
  return `${recipe.yieldValue} ${recipe.yieldUnit}`
}

onMounted(load)
</script>

<template>
  <div class="search-view">
    <h1 class="h4 mb-3">Buscar por ingredientes</h1>
    <p class="text-muted">Agregá los ingredientes que tenés y vas a ver las recetas que podés preparar con eso.</p>

    <IngredientChips v-model="onHand" class="mb-4" />

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="loading" class="text-muted">Cargando recetas...</div>
    <div v-else-if="onHand.length === 0" class="text-muted">
      Agregá al menos un ingrediente para empezar a buscar.
    </div>
    <div v-else-if="results.length === 0" class="text-muted">
      No se encontraron recetas que se puedan preparar con esos ingredientes.
    </div>

    <ul v-else class="list-group">
      <li v-for="recipe in results" :key="recipe.id" class="list-group-item">
        <RouterLink :to="{ name: 'recetas-detalle', params: { id: recipe.id } }" class="recipe-link">
          <span class="fw-semibold">{{ recipe.name }}</span>
          <span class="text-muted ms-2">{{ yieldLabel(recipe) }} · {{ recipe.ingredients.length }} ingredientes</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.recipe-link {
  text-decoration: none;
  color: inherit;
  display: block;
}
</style>
