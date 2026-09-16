import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import cartWiseRoutes from '@/apps/cart-wise/routes'
import globalExchangeRoutes from '@/apps/global-exchange/routes'
import calcInvoicesRoutes from '@/apps/calc-invoices/routes'
import lunarGardenRoutes from '@/apps/lunar-garden/routes'
import sprayMixRoutes from '@/apps/spray-mix/routes'
import ahorrosRoutes from '@/apps/ahorros/routes'
import gymLogRoutes from '@/apps/gym-log/routes'
import recetasRoutes from '@/apps/recetas/routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/shared/views/HomeView.vue'),
      meta: { public: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/shared/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/perfil',
      name: 'profile',
      component: () => import('@/shared/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    cartWiseRoutes,
    globalExchangeRoutes,
    calcInvoicesRoutes,
    lunarGardenRoutes,
    sprayMixRoutes,
    ahorrosRoutes,
    gymLogRoutes,
    recetasRoutes,
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  if (!authStore.ready) {
    await new Promise((resolve) => {
      const unwatch = authStore.$subscribe(() => {
        if (authStore.ready) {
          unwatch()
          resolve()
        }
      })
    })
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && authStore.isAuthenticated) {
    return { path: '/' }
  }
})

export default router
