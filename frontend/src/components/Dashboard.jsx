import { useState, useEffect } from 'react'
import { getWatchlist, searchMedia, addToWatchlist, removeFromWatchlist, toggleWatched, getConfig } from '../api/watchlist'
import MediaCard from './MediaCard'
import FilterBar from './FilterBar'
import AddMediaModal from './AddMediaModal'
import Navbar from './Navbar'

function Dashboard() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState({})
  const [filters, setFilters] = useState({
    media_type: 'all',
    watched: 'all',
    availability: 'all',
    search: ''
  })
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Load config on mount
    getConfig().then(setConfig).catch(err => {
      console.error('Error loading config:', err)
      // Set defaults if config fails
      setConfig({
        jellyseerr_base_url: import.meta.env.VITE_JELLYSEERR_BASE_URL || '',
        jellyfin_base_url: import.meta.env.VITE_JELLYFIN_BASE_URL || ''
      })
    })
  }, [])

  const loadWatchlist = async () => {
    setLoading(true)
    try {
      const data = await getWatchlist(filters)
      setItems(data.items)
    } catch (error) {
      console.error('Error loading watchlist:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWatchlist()
  }, [filters])

  const handleAddItem = async (item) => {
    try {
      await addToWatchlist(item)
      await loadWatchlist()
      setShowModal(false)
    } catch (error) {
      console.error('Error adding item:', error)
      alert(error.response?.data?.detail || 'Error adding item to watchlist')
    }
  }

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('Remove from watchlist?')) return
    try {
      await removeFromWatchlist(itemId)
      await loadWatchlist()
    } catch (error) {
      console.error('Error removing item:', error)
    }
  }

  const handleToggleWatched = async (itemId) => {
    try {
      await toggleWatched(itemId)
      await loadWatchlist()
    } catch (error) {
      console.error('Error toggling watched:', error)
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  return (
    <>
      <Navbar 
        onAddClick={() => setShowModal(true)}
      />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <FilterBar 
          filters={filters}
          onFilterChange={handleFilterChange}
          searchValue={filters.search}
          onSearchChange={(search) => handleFilterChange({ search })}
        />
        
        {loading ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">Loading...</p>
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="mb-4 sm:mb-6">
              <p className="text-text-secondary text-xs sm:text-sm">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            <div className="watchlist-grid grid grid-cols-4 gap-4 sm:gap-6">
              {items.map(item => (
                <MediaCard
                  key={item.id}
                  item={item}
                  config={config}
                  onRemove={handleRemoveItem}
                  onToggleWatched={handleToggleWatched}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 sm:py-16 px-6 sm:px-8 bg-[#17131D] rounded-xl">
            <h2 className="text-xl sm:text-2xl mb-2 text-text-primary font-medium">Your watchlist is empty</h2>
            <p className="text-text-secondary mb-6 text-sm sm:text-base">Start adding movies and TV shows to track what you want to watch.</p>
            <button 
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 border border-accent/30 text-accent rounded-lg text-sm font-medium hover:bg-accent/10 hover:border-accent/50 active:bg-accent/15 transition-all touch-manipulation min-h-[44px]"
            >
              Add Media
            </button>
          </div>
        )}
      </div>

      <AddMediaModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAdd={handleAddItem}
        onSearch={searchMedia}
      />
    </>
  )
}

export default Dashboard
