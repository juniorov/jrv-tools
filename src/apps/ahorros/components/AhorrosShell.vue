<script setup>
import { computed } from 'vue'
import { Offcanvas } from 'bootstrap'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// En routes.js las páginas de detalle (cuentas/:id, objetivos/:id) son rutas HERMANAS de su
// listado, no hijas anidadas de ese listado. El active-class por defecto de RouterLink solo
// marca un link activo cuando el registro de ruta al que apunta aparece en la cadena de rutas
// coincidentes de la ruta actual, así que en el detalle ese registro "hermano" nunca aparece y
// el link del listado queda sin marcar. Se calcula a mano contra el nombre de ruta para que el
// listado se mantenga resaltado también al entrar al detalle correspondiente.
const isObjetivosActive = computed(
  () => route.name === 'ahorros-objetivos' || route.name === 'ahorros-objetivo-detail',
)
const isCuentasActive = computed(
  () => route.name === 'ahorros-cuentas' || route.name === 'ahorros-cuenta-detail',
)

function closeMenu() {
  const el = document.getElementById('ahorrosNav')
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
      <RouterLink class="navbar-brand fw-bold" to="/ahorros">
        <i class="bi bi-piggy-bank-fill me-1"></i>Ahorros
      </RouterLink>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#ahorrosNav"
        aria-controls="ahorrosNav"
        aria-label="Abrir menú"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div
        id="ahorrosNav"
        class="offcanvas offcanvas-start offcanvas-md"
        tabindex="-1"
        aria-labelledby="ahorrosNavLabel"
      >
        <div class="offcanvas-header">
          <h5 id="ahorrosNavLabel" class="offcanvas-title">
            <i class="bi bi-piggy-bank-fill me-1"></i>Ahorros
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
              <RouterLink
                class="nav-link"
                to="/ahorros"
                :class="{ active: isObjetivosActive }"
                @click="closeMenu"
              >
                Objetivos
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink
                class="nav-link"
                to="/ahorros/cuentas"
                :class="{ active: isCuentasActive }"
                @click="closeMenu"
              >
                Cuentas
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink
                class="nav-link"
                to="/ahorros/entidades"
                active-class="active"
                @click="closeMenu"
              >
                Entidades
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

  <main class="container py-4 pb-mobile-nav">
    <RouterView />
  </main>

  <nav class="bottom-nav d-md-none">
    <RouterLink to="/ahorros" class="bottom-nav-item" :class="{ active: isObjetivosActive }">
      <i class="bi bi-flag-fill"></i>
      <span>Objetivos</span>
    </RouterLink>
    <RouterLink to="/ahorros/cuentas" class="bottom-nav-item" :class="{ active: isCuentasActive }">
      <i class="bi bi-wallet2"></i>
      <span>Cuentas</span>
    </RouterLink>
    <RouterLink to="/ahorros/entidades" class="bottom-nav-item" active-class="active">
      <i class="bi bi-bank"></i>
      <span>Entidades</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.app-navbar {
  background-color: var(--color-primary);
  /* Se apila debajo del AppTopBar del suite (2.75rem), que también es sticky-top. */
  top: 2.75rem;
}

/* Por debajo de md, el offcanvas es un panel propio (no hereda el fondo oscuro
   del navbar), así que necesita su propio fondo oscuro para que el texto claro
   de .navbar-dark siga siendo legible. Desde md, Bootstrap lo vuelve transparente
   automáticamente (offcanvas-md) y hereda el fondo del navbar. */
#ahorrosNav {
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
  .pb-mobile-nav {
    padding-bottom: calc(4rem + env(safe-area-inset-bottom)) !important;
  }
}
</style>
