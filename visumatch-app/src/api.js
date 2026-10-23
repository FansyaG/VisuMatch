import router from './router'
import { showToast } from './toast'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

export async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const token = localStorage.getItem('token')

  const headers = new Headers(options.headers || {})

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Set JSON Content-Type only if not FormData and not already set
  const isFormData = options.body instanceof FormData
  if (!isFormData && !headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  const fetchOptions = {
    ...options,
    headers,
  }

  try {
    const res = await fetch(url, fetchOptions)

    // Handle 401 Unauthorized
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    }

    // Check if response is blob / file download
    const contentType = res.headers.get('content-type') || ''
    if (
      contentType.includes('application/xml') ||
      contentType.includes('text/plain') ||
      contentType.includes('application/octet-stream')
    ) {
      if (!res.ok) {
        let errorMsg = `Request gagal dengan status ${res.status}`
        try {
          const errData = await res.json()
          errorMsg = errData?.error?.message || errData?.message || errorMsg
        } catch {
          // ignore
        }
        showToast(errorMsg, 'error')
        throw new Error(errorMsg)
      }
      return await res.blob()
    }

    let data = null
    const text = await res.text()
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }

    if (!res.ok) {
      const errorMessage =
        (typeof data === 'object' && data?.error?.message) ||
        (typeof data === 'object' && data?.message) ||
        `Terjadi kesalahan (${res.status})`

      showToast(errorMessage, 'error')

      const err = new Error(errorMessage)
      err.status = res.status
      err.data = data
      throw err
    }

    return data
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.includes('fetch')) {
      const netMsg = 'Tidak dapat terhubung ke server backend atau terjadi kendala CORS.'
      showToast(netMsg, 'error')
      console.error('[API Network/CORS Error]', err)
    }
    throw err
  }
}

export const api = {
  // Auth
  register: (username, email, password) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),
  verifyEmail: (email, code) =>
    apiRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  resendCode: (email) =>
    apiRequest('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  login: (identifier, password) => {
    // If identifier contains @, pass as email, otherwise username
    // Or pass both / match schema
    const isEmail = identifier.includes('@')
    const body = isEmail
      ? { email: identifier, password }
      : { username: identifier, password }
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
  getMe: () => apiRequest('/auth/me', { method: 'GET' }),

  // Projects
  getProjects: () => apiRequest('/projects', { method: 'GET' }),
  getProjectDetail: (id) => apiRequest(`/projects/${id}`, { method: 'GET' }),
  createProject: (projectName, resolution = '1080p') =>
    apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({ project_name: projectName, resolution }),
    }),
  deleteProject: (id) =>
    apiRequest(`/projects/${id}`, {
      method: 'DELETE',
    }),
  updateAISettings: (id, settings) =>
    apiRequest(`/projects/${id}/ai-settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Upload A-Roll
  uploadARoll: (projectId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiRequest(`/projects/${projectId}/aroll`, {
      method: 'POST',
      body: formData,
    })
  },

  // Pipeline Status & Manual stages
  getPipelineStatus: (projectId) =>
    apiRequest(`/projects/${projectId}/pipeline-status`, { method: 'GET' }),

  // Timeline
  getTimeline: (projectId) =>
    apiRequest(`/projects/${projectId}/timeline`, { method: 'GET' }),
  patchTimeline: (projectId, edlId, updateData) =>
    apiRequest(`/projects/${projectId}/timeline/${edlId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    }),
  deleteTimeline: (edlId) =>
    apiRequest(`/timeline/${edlId}`, {
      method: 'DELETE',
    }),
  regenerateTimeline: (edlId, keyword) =>
    apiRequest(`/timeline/${edlId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ keyword: keyword || undefined }),
    }),

  // Search B-Roll & Add from search
  searchBroll: (params) => {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.source) query.set('source', params.source)
    if (params.page) query.set('page', params.page)
    if (params.per_page) query.set('per_page', params.per_page)
    if (params.orientation) query.set('orientation', params.orientation)
    return apiRequest(`/search/broll?${query.toString()}`, { method: 'GET' })
  },
  addTimelineFromSearch: (projectId, payload) =>
    apiRequest(`/projects/${projectId}/timeline/from-search`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Export
  exportTimeline: async (projectId, format = 'xml') => {
    return apiRequest(`/projects/${projectId}/export/timeline?format=${format}`, {
      method: 'GET',
    })
  },

  // Admin Assets
  getAssets: () => apiRequest('/assets', { method: 'GET' }),
  getAdminAssets: () => apiRequest('/admin/assets', { method: 'GET' }),
  createAdminAsset: (formData) =>
    apiRequest('/admin/assets', {
      method: 'POST',
      body: formData,
    }),
  updateAdminAsset: (id, data) =>
    apiRequest(`/admin/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAdminAsset: (id) =>
    apiRequest(`/admin/assets/${id}`, {
      method: 'DELETE',
    }),

  // Admin API Keys
  getAdminApiKeys: () => apiRequest('/admin/api-keys', { method: 'GET' }),
  createAdminApiKey: (payload) =>
    apiRequest('/admin/api-keys', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
