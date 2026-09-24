export default {
  path: '/recetas',
  meta: { appSlug: 'recetas', requiresAuth: true },
  component: () => import('@/apps/recetas/components/RecetasShell.vue'),
  children: [
    { path: '', name: 'recetas-buscar', component: () => import('@/apps/recetas/views/SearchView.vue') },
    { path: 'recetario', name: 'recetas-lista', component: () => import('@/apps/recetas/views/RecipesListView.vue') },
    { path: 'recetario/nueva', name: 'recetas-nueva', component: () => import('@/apps/recetas/views/RecipeFormView.vue') },
    { path: 'recetario/:id', name: 'recetas-detalle', component: () => import('@/apps/recetas/views/RecipeDetailView.vue') },
    { path: 'recetario/:id/editar', name: 'recetas-editar', component: () => import('@/apps/recetas/views/RecipeFormView.vue') },
    { path: 'menu-semanal', name: 'recetas-menu-semanal', component: () => import('@/apps/recetas/views/WeeklyMenuView.vue') },
    { path: 'progreso', name: 'recetas-progreso', component: () => import('@/apps/recetas/views/ProgressDashboardView.vue') },
    { path: 'progreso/nueva', name: 'recetas-progreso-nueva', component: () => import('@/apps/recetas/views/BodyMetricFormView.vue') },
    { path: 'progreso/:id/editar', name: 'recetas-progreso-editar', component: () => import('@/apps/recetas/views/BodyMetricFormView.vue') },
  ],
}
