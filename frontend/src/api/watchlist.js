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
  if (filters.sort) {
    params.append('sort', filters.sort)
  }
  if (filters.genres && filters.genres.length > 0) {
    params.append('genres', filters.genres.join(','))
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

export const addToQueue = async (itemId) => {
  const response = await api.post(`/watchlist/${itemId}/add-to-queue`)
  return response.data
}

export const removeFromQueue = async (itemId) => {
  const response = await api.post(`/watchlist/${itemId}/remove-from-queue`)
  return response.data
}

export const reorderQueue = async (itemOrders) => {
  const response = await api.post('/watchlist/reorder-queue', { item_orders: itemOrders })
  return response.data
}

export const getQueue = async () => {
  const response = await api.get('/watchlist/queue')
  return response.data
}

