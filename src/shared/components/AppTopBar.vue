<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apps } from '@/shared/apps.registry'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentApp = computed(() => apps.find((app) => app.slug === route.meta.appSlug))

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="suite-topbar sticky-top">
    <button
      class="suite-topbar-btn"
      type="button"
      data-bs-toggle="offcanvas"
      data-bs-target="#appLauncher"
      aria-controls="appLauncher"
      aria-label="Abrir selector de herramientas"
    >
      <i class="bi bi-list"></i>
    </button>

    <RouterLink to="/" class="suite-topbar-brand">
      <template v-if="currentApp">
        <i :class="['bi', currentApp.icon]" :style="{ color: currentApp.color }"></i>
        <span>{{ currentApp.name }}</span>
      </template>
      <template v-else>
        <i class="bi bi-grid-3x3-gap-fill"></i>
        <span>JRV Tools</span>
      </template>
    </RouterLink>

    <div class="suite-topbar-account">
      <RouterLink to="/configuracion" class="suite-topbar-btn" title="Configurar mini apps">
        <i class="bi bi-sliders"></i>
      </RouterLink>
      <RouterLink v-if="!authStore.isAuthenticated" to="/login" class="suite-topbar-btn">
        <i class="bi bi-person-circle"></i>
      </RouterLink>
      <template v-else>
        <RouterLink to="/perfil" class="suite-topbar-btn" title="Mi cuenta">
          <i class="bi bi-person-circle"></i>
        </RouterLink>
        <button class="suite-topbar-btn" type="button" @click="handleLogout" title="Salir">
          <i class="bi bi-box-arrow-right"></i>
        </button>
      </template>
    </div>
  </header>
</template>

<style scoped>
.suite-topbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.75rem;
  padding: 0 0.5rem;
  background-color: #111827;
  color: #f9fafb;
  z-index: 1030;
}

.suite-topbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 1.15rem;
  border-radius: 0.5rem;
  text-decoration: none;
}

.suite-topbar-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.suite-topbar-brand {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: inherit;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.suite-topbar-account {
  display: flex;
  align-items: center;
}
</style>
