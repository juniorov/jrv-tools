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
  ],
}
