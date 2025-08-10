export const getApiBase = () => {
  const viteEnv = (typeof import.meta !== 'undefined' && import.meta && import.meta.env) ? import.meta.env : {}
  const raw = viteEnv.VITE_API_URL || 'http://localhost:8000/api/v1'
  return raw.replace(/\/?v1\/?$/, '')
}

export const getAuthToken = () => localStorage.getItem('token')
export const setAuthToken = (token) => localStorage.setItem('token', token)
export const clearAuth = () => localStorage.removeItem('token')

export const redirectToLogin = () => {
  window.location.href = '/login.html'
}

export const authorizedFetch = async (input, init = {}) => {
  const token = getAuthToken()
  const headers = {
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
  }
  return fetch(input, { ...init, headers })
}

export const fetchJsonOrThrow = async (response) => {
  if (response.status === 401) {
    clearAuth()
    redirectToLogin()
    throw new Error('Unauthenticated')
  }
  if (response.status === 403) {
    throw new Error('Forbidden')
  }
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }
  return response.json()
}