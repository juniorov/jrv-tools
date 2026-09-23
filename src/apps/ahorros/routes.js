export default {
  path: '/ahorros',
  meta: { appSlug: 'ahorros', requiresAuth: true },
  component: () => import('@/apps/ahorros/components/AhorrosShell.vue'),
  children: [
    {
      path: '',
      name: 'ahorros-objetivos',
      component: () => import('@/apps/ahorros/views/ObjetivosView.vue'),
    },
    {
      path: 'objetivos/:id',
      name: 'ahorros-objetivo-detail',
      component: () => import('@/apps/ahorros/views/ObjetivoDetailView.vue'),
    },
    {
      path: 'cuentas',
      name: 'ahorros-cuentas',
      component: () => import('@/apps/ahorros/views/CuentasView.vue'),
    },
    {
      path: 'cuentas/:id',
      name: 'ahorros-cuenta-detail',
      component: () => import('@/apps/ahorros/views/CuentaDetailView.vue'),
    },
    {
      path: 'entidades',
      name: 'ahorros-entidades',
      component: () => import('@/apps/ahorros/views/EntidadesView.vue'),
    },
    {
      path: 'prestamos',
      name: 'ahorros-prestamos',
      component: () => import('@/apps/ahorros/views/PrestamosView.vue'),
    },
    {
      path: 'prestamos/:id',
      name: 'ahorros-prestamo-detail',
      component: () => import('@/apps/ahorros/views/PrestamoDetailView.vue'),
    },
  ],
}
