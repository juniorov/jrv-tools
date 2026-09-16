<script setup>
const props = defineProps({
  modelValue: { type: Array, required: true },
})
const emit = defineEmits(['update:modelValue'])

const UNIT_SUGGESTIONS = ['g', 'kg', 'ml', 'l', 'unidad', 'taza', 'cucharada', 'cucharadita', 'pizca']

function addIngredient() {
  emit('update:modelValue', [...props.modelValue, { name: '', quantity: null, unit: '' }])
}

function removeIngredient(index) {
  const rows = [...props.modelValue]
  rows.splice(index, 1)
  emit('update:modelValue', rows)
}

function updateField(index, field, value) {
  const rows = [...props.modelValue]
  rows[index] = { ...rows[index], [field]: value }
  emit('update:modelValue', rows)
}
</script>

<template>
  <div class="ingredient-rows">
    <div v-for="(ingredient, index) in modelValue" :key="index" class="row g-2 mb-2 align-items-center">
      <div class="col-12 col-md-5">
        <input
          :value="ingredient.name"
          type="text"
          class="form-control"
          placeholder="Ingrediente"
          required
          @input="updateField(index, 'name', $event.target.value)"
        />
      </div>
      <div class="col-4 col-md-3">
        <input
          :value="ingredient.quantity"
          type="number"
          min="0"
          step="any"
          class="form-control"
          placeholder="Cantidad"
          required
          @input="updateField(index, 'quantity', $event.target.value === '' ? null : Number($event.target.value))"
        />
      </div>
      <div class="col-5 col-md-3">
        <input
          :value="ingredient.unit"
          type="text"
          class="form-control"
          placeholder="Unidad"
          list="recetas-unit-suggestions"
          @input="updateField(index, 'unit', $event.target.value)"
        />
      </div>
      <div class="col-3 col-md-1 d-flex justify-content-end">
        <button type="button" class="btn btn-outline-danger btn-sm" @click="removeIngredient(index)">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>

    <datalist id="recetas-unit-suggestions">
      <option v-for="unit in UNIT_SUGGESTIONS" :key="unit" :value="unit" />
    </datalist>

    <button type="button" class="btn btn-outline-secondary btn-sm" @click="addIngredient">
      <i class="bi bi-plus-lg me-1"></i>Agregar ingrediente
    </button>
  </div>
</template>
