import api from './client'

export const getConfig = async () => {
  const response = await api.get('/config')
  return response.data
}

export const getWatchlist = async (filters = {}) => {
  const params = new URLSearchParams()
  if (filters.media_type && filters.media_type !== 'all') {
    params.append('media_type', filters.media_type)
  }
  if (filters.watched && filters.watched !== 'all') {
    params.append('watched', filters.watched)
  }
  if (filters.availability && filters.availability !== 'all') {
    params.append('availability', filters.availability)
  }
  if (filters.search) {
    params.append('search', filters.search)
  }
  
  const response = await api.get(`/watchlist?${params.toString()}`)
  return response.data
}

export const searchMedia = async (query, type = 'all') => {
  const response = await api.get(`/search?q=${encodeURIComponent(query)}&type=${type}`)
  return response.data
}

export const addToWatchlist = async (item) => {
  const response = await api.post('/watchlist', item)
  return response.data
}

export const removeFromWatchlist = async (itemId) => {
  await api.delete(`/watchlist/${itemId}`)
}

export const toggleWatched = async (itemId) => {
  const response = await api.post(`/watchlist/${itemId}/toggle-watched`)
  return response.data
}

