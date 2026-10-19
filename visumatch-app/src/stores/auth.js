import { ref, computed } from 'vue'
import { api } from '../api'

const token = ref(localStorage.getItem('token') || '')
const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value)
  const role = computed(() => user.value?.role || '')
  const isAdmin = computed(() => role.value === 'Admin')
  const username = computed(() => user.value?.username || '')

  const login = async (usernameInput, passwordInput) => {
    const data = await api.login(usernameInput, passwordInput)
    if (data.token) {
      token.value = data.token
      localStorage.setItem('token', data.token)
      
      const userData = data.user || { username: usernameInput, role: 'Creator' }
      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))
      
      // Attempt to refresh profile with /auth/me for fresh info
      try {
        const meRes = await api.getMe()
        if (meRes.user) {
          user.value = meRes.user
          localStorage.setItem('user', JSON.stringify(meRes.user))
        }
      } catch (e) {
        // me call failsafe
      }
    }
    return data
  }

  const logout = () => {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return {
    token,
    user,
    role,
    isAdmin,
    username,
    isAuthenticated,
    login,
    logout,
  }
}
