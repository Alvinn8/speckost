import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('../views/HomeView.vue') },
    { path: '/food-items', component: () => import('../views/FoodItemsView.vue') },
    { path: '/food-items/:id', component: () => import('../views/FoodItemDetailView.vue') },
  ],
})

export default router
