<script setup>
import { computed } from 'vue'
import { Offcanvas } from 'bootstrap'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// "Progreso" tiene rutas hermanas (listado + nueva/editar), así que el active-class por
// defecto de RouterLink no alcanza para el listado cuando se está en una de esas hermanas
// (mismo problema resuelto en AhorrosShell.vue).
const isProgresoActive = computed(
  () => route.name === 'recetas-progreso' || route.name === 'recetas-progreso-nueva' || route.name === 'recetas-progreso-editar',
)

function closeMenu() {
  const el = document.getElementById('recetasNav')
  const instance = el && Offcanvas.getInstance(el)
  instance?.hide()
}

async function handleLogout() {
  closeMenu()
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <nav class="navbar navbar-expand-md navbar-dark app-navbar sticky-top">
    <div class="container-fluid">
      <RouterLink class="navbar-brand fw-bold" to="/recetas">
        <i class="bi bi-egg-fried me-1"></i>Recetas
      </RouterLink>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#recetasNav"
        aria-controls="recetasNav"
        aria-label="Abrir menú"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div
        id="recetasNav"
        class="offcanvas offcanvas-start offcanvas-md"
        tabindex="-1"
        aria-labelledby="recetasNavLabel"
      >
        <div class="offcanvas-header">
          <h5 id="recetasNavLabel" class="offcanvas-title">
            <i class="bi bi-egg-fried me-1"></i>Recetas
          </h5>
          <button
            type="button"
            class="btn-close btn-close-white"
            data-bs-dismiss="offcanvas"
            aria-label="Cerrar"
          ></button>
        </div>
        <div class="offcanvas-body">
          <ul class="navbar-nav ms-md-auto">
            <li class="nav-item">
              <RouterLink class="nav-link" to="/recetas" active-class="active" @click="closeMenu">
                Buscar
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink
                class="nav-link"
                to="/recetas/recetario"
                active-class="active"
                @click="closeMenu"
              >
                Recetario
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink
                class="nav-link"
                to="/recetas/menu-semanal"
                active-class="active"
                @click="closeMenu"
              >
                Menú semanal
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink
                class="nav-link"
                to="/recetas/progreso"
                :class="{ active: isProgresoActive }"
                @click="closeMenu"
              >
                Progreso
              </RouterLink>
            </li>
            <li v-if="authStore.isAuthenticated" class="nav-item">
              <button class="nav-link btn btn-link" @click="handleLogout">
                <i class="bi bi-box-arrow-right me-1"></i>Salir
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </nav>

  <main class="container py-4">
    <RouterView />
  </main>

  <nav class="bottom-nav d-md-none">
    <RouterLink to="/recetas" class="bottom-nav-item" active-class="active">
      <i class="bi bi-search"></i>
      <span>Buscar</span>
    </RouterLink>
    <RouterLink to="/recetas/recetario" class="bottom-nav-item" active-class="active">
      <i class="bi bi-journal-text"></i>
      <span>Recetario</span>
    </RouterLink>
    <RouterLink to="/recetas/menu-semanal" class="bottom-nav-item" active-class="active">
      <i class="bi bi-calendar-week"></i>
      <span>Menú</span>
    </RouterLink>
    <RouterLink to="/recetas/progreso" class="bottom-nav-item" :class="{ active: isProgresoActive }">
      <i class="bi bi-graph-up"></i>
      <span>Progreso</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.app-navbar {
  background-color: var(--color-primary);
  top: 2.75rem;
}

#recetasNav {
  --bs-offcanvas-bg: var(--color-primary);
  --bs-offcanvas-color: var(--color-on-primary);
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-sticky);
  display: flex;
  height: 4rem;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-decoration: none;
}

.bottom-nav-item i {
  font-size: var(--font-size-lg);
}

.bottom-nav-item.active {
  color: var(--color-primary);
}

@media (max-width: 767.98px) {
  main.container {
    padding-bottom: calc(4rem + env(safe-area-inset-bottom)) !important;
  }
}
</style>
