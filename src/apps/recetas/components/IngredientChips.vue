<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: Array, required: true },
})
const emit = defineEmits(['update:modelValue'])

const draft = ref('')

function addChip() {
  const value = draft.value.trim()
  if (!value) return
  if (!props.modelValue.some((item) => item.toLowerCase() === value.toLowerCase())) {
    emit('update:modelValue', [...props.modelValue, value])
  }
  draft.value = ''
}

function removeChip(index) {
  const chips = [...props.modelValue]
  chips.splice(index, 1)
  emit('update:modelValue', chips)
}
</script>

<template>
  <div class="ingredient-chips">
    <div class="chips-input-row">
      <input
        v-model="draft"
        type="text"
        class="form-control"
        placeholder="Escribí un ingrediente y presioná Enter"
        @keydown.enter.prevent="addChip"
      />
      <button type="button" class="btn btn-outline-primary" @click="addChip">
        <i class="bi bi-plus-lg"></i>
      </button>
    </div>

    <div v-if="modelValue.length" class="chips-list mt-2">
      <span v-for="(chip, index) in modelValue" :key="chip + index" class="badge chip">
        {{ chip }}
        <button type="button" class="chip-remove" aria-label="Quitar" @click="removeChip(index)">
          <i class="bi bi-x"></i>
        </button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.chips-input-row {
  display: flex;
  gap: 0.5rem;
}

.chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background-color: var(--color-primary-bg, rgba(245, 158, 11, 0.15));
  color: var(--color-primary, #b45309);
  font-weight: 500;
  padding: 0.35rem 0.6rem;
  border-radius: var(--radius-full, 9999px);
}

.chip-remove {
  border: none;
  background: transparent;
  color: inherit;
  line-height: 1;
  padding: 0;
  display: inline-flex;
}
</style>
