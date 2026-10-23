import { createRouter, createWebHistory } from 'vue-router'
import Landing from '../views/Landing.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import VerifyEmail from '../views/VerifyEmail.vue'
import Dashboard from '../views/Dashboard.vue'
import Workspace from '../views/Workspace.vue'
import Admin from '../views/Admin.vue'
import { api } from '../api'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'landing', component: Landing },
    { path: '/login', name: 'login', component: Login, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: Register, meta: { guestOnly: true } },
    { path: '/verify-email', name: 'verify-email', component: VerifyEmail, meta: { guestOnly: true } },
    { path: '/dashboard', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true, role: 'Creator' } },
    { path: '/workspace', name: 'workspace', component: Workspace, meta: { requiresAuth: true, role: 'Creator' } },
    { path: '/workspace/:id', name: 'workspace-detail', component: Workspace, meta: { requiresAuth: true, role: 'Creator' } },
    { path: '/admin', name: 'admin', component: Admin, meta: { requiresAuth: true, role: 'Admin' } },
  ],
  // Otomatis scroll ke atas setiap kali pindah halaman
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  }
})

// Helper untuk redirect berdasarkan role
function getDefaultHomeForRole(role) {
  return role === 'Admin' ? '/admin' : '/dashboard'
}

let isRestoringSession = false

router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('token')
  let user = JSON.parse(localStorage.getItem('user') || 'null')

  // Validasi login dan pulihkan profil dengan GET /auth/me jika ada token
  if (token && !isRestoringSession) {
    // Jalankan validasi sekali atau saat user role belum ada / untuk memastikan token valid
    try {
      isRestoringSession = true
      const meRes = await api.getMe()
      if (meRes?.user) {
        user = meRes.user
        localStorage.setItem('user', JSON.stringify(meRes.user))
        if (meRes.user.role) {
          localStorage.setItem('role', meRes.user.role)
        }
      }
    } catch (err) {
      if (err?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('role')
        if (to.meta.requiresAuth) {
          isRestoringSession = false
          return next({ path: '/login' })
        }
      }
    } finally {
      isRestoringSession = false
    }
  }

  const currentToken = localStorage.getItem('token')
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
  const userRole = currentUser?.role || localStorage.getItem('role') || 'Creator'

  // 1. Jika halaman hanya untuk yang belum login (guestOnly: /login, /register, /verify-email)
  // dan pengguna SUDAH login -> arahkan ke halaman utama sesuai role
  if (to.meta.guestOnly && currentToken) {
    return next({ path: getDefaultHomeForRole(userRole) })
  }

  // Khusus landing page ('/'): jika sudah login, arahkan ke halaman utama sesuai role
  if (to.path === '/' && currentToken) {
    return next({ path: getDefaultHomeForRole(userRole) })
  }

  // 2. Jika halaman membutuhkan login (requiresAuth) tapi pengguna belum login -> arahkan ke /login
  if (to.meta.requiresAuth && !currentToken) {
    return next({ path: '/login' })
  }

  // 3. Aturan Role spesifik:
  // - /dashboard dan /workspace/:id hanya untuk role Creator. Admin yang membukanya diarahkan ke /admin.
  // - /admin hanya untuk role Admin. Creator yang membukanya diarahkan ke /dashboard.
  if (currentToken && to.meta.role) {
    if (to.meta.role === 'Creator' && userRole === 'Admin') {
      return next({ path: '/admin' })
    }
    if (to.meta.role === 'Admin' && userRole !== 'Admin') {
      return next({ path: '/dashboard' })
    }
  }

  next()
})

export default router
