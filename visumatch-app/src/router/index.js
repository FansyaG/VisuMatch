import { createRouter, createWebHistory } from 'vue-router'
import Landing from '../views/Landing.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'
import Workspace from '../views/Workspace.vue'
import Admin from '../views/Admin.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'landing', component: Landing },
    { path: '/login', name: 'login', component: Login },
    { path: '/register', name: 'register', component: Register },
    { path: '/dashboard', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/workspace', name: 'workspace', component: Workspace, meta: { requiresAuth: true } },
    { path: '/workspace/:id', name: 'workspace-detail', component: Workspace, meta: { requiresAuth: true } },
    { path: '/admin', name: 'admin', component: Admin, meta: { requiresAuth: true, requiresAdmin: true } }
  ],
  // Otomatis scroll ke atas setiap kali pindah halaman
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  }
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  if (to.meta.requiresAuth && !token) {
    return next({ path: '/login' })
  }

  if (to.meta.requiresAdmin && user?.role !== 'Admin') {
    return next({ path: '/dashboard' })
  }

  if (to.path === '/login' && token) {
    return next({ path: '/dashboard' })
  }

  next()
})

export default router
