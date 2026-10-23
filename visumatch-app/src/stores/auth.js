import { ref, computed } from 'vue'
import { api } from '../api'

const token = ref(localStorage.getItem('token') || '')
const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value)
  const role = computed(() => user.value?.role || localStorage.getItem('role') || '')
  const isAdmin = computed(() => role.value === 'Admin')
  const username = computed(() => user.value?.username || '')

  const setAuth = (tokenVal, userVal) => {
    token.value = tokenVal || ''
    user.value = userVal || null
    if (tokenVal) {
      localStorage.setItem('token', tokenVal)
    } else {
      localStorage.removeItem('token')
    }
    if (userVal) {
      localStorage.setItem('user', JSON.stringify(userVal))
      if (userVal.role) {
        localStorage.setItem('role', userVal.role)
      }
    } else {
      localStorage.removeItem('user')
      localStorage.removeItem('role')
    }
  }

  const login = async (identifier, passwordInput) => {
    const data = await api.login(identifier, passwordInput)
    if (data.token) {
      const userData = data.user || { username: identifier, role: 'Creator' }
      setAuth(data.token, userData)
      
      // Attempt to refresh profile with /auth/me for fresh info
      try {
        const meRes = await api.getMe()
        if (meRes.user) {
          setAuth(data.token, meRes.user)
        }
      } catch (e) {
        // me call failsafe
      }
    }
    return data
  }

  const logout = () => {
    setAuth('', null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
  }

  const restoreSession = async () => {
    const storedToken = localStorage.getItem('token')
    if (!storedToken) {
      logout()
      return false
    }
    token.value = storedToken
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null')
    if (storedUser) {
      user.value = storedUser
    }
    try {
      const meRes = await api.getMe()
      if (meRes.user) {
        setAuth(storedToken, meRes.user)
        return true
      }
    } catch (err) {
      if (err?.status === 401) {
        logout()
        return false
      }
    }
    return !!token.value
  }

  return {
    token,
    user,
    role,
    isAdmin,
    username,
    isAuthenticated,
    setAuth,
    login,
    logout,
    restoreSession,
  }
}

