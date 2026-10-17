import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'landing', component: () => import('../views/Landing.vue') },
    { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
    {path: '/register', name: 'register', component: () => import('../views/Register.vue') },
    { path: '/dashboard', name: 'dashboard', component: () => import('../views/Dashboard.vue') },
    { path: '/workspace', name: 'workspace', component: () => import('../views/Workspace.vue') },
    { path: '/admin', name: 'admin', component: () => import('../views/Admin.vue') }
  ]
})

export default router