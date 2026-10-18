<script setup>
import { useAppsStore } from '@/shared/stores/apps'
import { apps } from '@/shared/apps.registry'

const appsStore = useAppsStore()
</script>

<template>
  <div class="container py-4">
    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">
        <div class="d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <h1 class="h4 mb-1"><i class="bi bi-grid-3x3-gap-fill me-1"></i>Mini apps</h1>
            <p class="text-muted small mb-0">Seleccioná las herramientas que querés ver en JRV Tools.</p>
          </div>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="appsStore.enableAll">
            Mostrar todas
          </button>
        </div>

        <div class="card shadow-sm border-0">
          <div class="list-group list-group-flush">
            <label v-for="app in apps" :key="app.slug" class="list-group-item app-setting d-flex align-items-center gap-3">
              <span class="app-setting-icon" :style="{ backgroundColor: app.color }">
                <i :class="['bi', app.icon]"></i>
              </span>
              <span class="flex-grow-1">
                <strong>{{ app.name }}</strong>
                <small class="d-block text-muted">{{ app.description }}</small>
              </span>
              <input
                class="form-check-input m-0"
                type="checkbox"
                :checked="appsStore.isEnabled(app.slug)"
                :aria-label="`Mostrar ${app.name}`"
                @change="appsStore.toggleApp(app.slug)"
              />
            </label>
          </div>
        </div>

        <p class="text-muted small mt-3 mb-0">
          Esta preferencia se guarda en este dispositivo y no afecta tus datos ni tu cuenta.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-setting {
  cursor: pointer;
}

.app-setting-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  color: #fff;
  font-size: 1.15rem;
}

.form-check-input {
  width: 1.2rem;
  height: 1.2rem;
}
</style>

