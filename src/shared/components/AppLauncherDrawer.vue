<script setup>
import { Offcanvas } from 'bootstrap'
import { useRoute } from 'vue-router'
import { useAppsStore } from '@/shared/stores/apps'

const route = useRoute()
const appsStore = useAppsStore()

function close() {
  const el = document.getElementById('appLauncher')
  const instance = el && Offcanvas.getInstance(el)
  instance?.hide()
}
</script>

<template>
  <div
    id="appLauncher"
    class="offcanvas offcanvas-start"
    tabindex="-1"
    aria-labelledby="appLauncherLabel"
  >
    <div class="offcanvas-header">
      <h5 id="appLauncherLabel" class="offcanvas-title">
        <i class="bi bi-grid-3x3-gap-fill me-1"></i>JRV Tools
      </h5>
      <button
        type="button"
        class="btn-close"
        data-bs-dismiss="offcanvas"
        aria-label="Cerrar"
      ></button>
    </div>
    <div class="offcanvas-body p-2">
      <RouterLink to="/" class="app-tile" @click="close">
        <span class="app-tile-icon" style="background-color: #6b7280">
          <i class="bi bi-house-door-fill"></i>
        </span>
        <span class="app-tile-text">
          <strong>Inicio</strong>
          <small>Ver todas las herramientas</small>
        </span>
      </RouterLink>

      <hr />

      <RouterLink
        v-for="app in appsStore.enabledApps"
        :key="app.slug"
        :to="app.routeBase"
        class="app-tile"
        :class="{ active: route.meta.appSlug === app.slug }"
        @click="close"
      >
        <span class="app-tile-icon" :style="{ backgroundColor: app.color }">
          <i :class="['bi', app.icon]"></i>
        </span>
        <span class="app-tile-text">
          <strong>{{ app.name }}</strong>
          <small>{{ app.description }}</small>
        </span>
      </RouterLink>

      <hr />

      <RouterLink to="/configuracion" class="app-tile" @click="close">
        <span class="app-tile-icon" style="background-color: #6b7280">
          <i class="bi bi-sliders"></i>
        </span>
        <span class="app-tile-text">
          <strong>Configurar mini apps</strong>
          <small>Elegir qué herramientas mostrar</small>
        </span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.app-tile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.5rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: inherit;
}

.app-tile:hover,
.app-tile.active {
  background-color: rgba(0, 0, 0, 0.05);
}

.app-tile-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  color: #fff;
  font-size: 1.2rem;
}

.app-tile-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.app-tile-text small {
  color: #6b7280;
}
</style>
