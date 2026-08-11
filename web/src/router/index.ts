import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('../views/HomeView.vue') },
    { path: '/food-items', component: () => import('../views/FoodItemsView.vue') },
    { path: '/food-items/:id', component: () => import('../views/FoodItemDetailView.vue') },
    { path: '/dishes', component: () => import('../views/DishesView.vue') },
    { path: '/restrictions', component: () => import('../views/RestrictionsView.vue') },
    { path: '/restrictions/:id', component: () => import('../views/RestrictionDetailView.vue') },
  ],
})

export default router
