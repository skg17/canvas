import api from './client'

export const login = async (password) => {
  const response = await api.post('/auth/login', { password })
  return response.data
}

export const logout = async () => {
  try {
    await api.post('/auth/logout')
  } catch (err) {
    // Ignore errors on logout
  }
  localStorage.removeItem('auth_token')
}

export const checkAuth = async () => {
  const response = await api.get('/auth/check')
  return response.data
}

