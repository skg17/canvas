import { useState, useEffect } from 'react'
import { HiXMark } from 'react-icons/hi2'
import { getQueue, removeFromQueue, reorderQueue } from '../api/watchlist'

function UpNextBanner({ config, onQueueUpdate }) {
  const [queueItems, setQueueItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [draggedItem, setDraggedItem] = useState(null)

  const loadQueue = async () => {
    setLoading(true)
    try {
      const data = await getQueue()
      setQueueItems(data.items || [])
      console.log('Queue loaded:', data.items?.length || 0, 'items')
    } catch (error) {
      console.error('Error loading queue:', error)
      setQueueItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQueue()
  }, [])

  useEffect(() => {
    if (onQueueUpdate !== undefined) {
      loadQueue()
    }
  }, [onQueueUpdate])

  const handleRemove = async (itemId) => {
    try {
      await removeFromQueue(itemId)
      await loadQueue()
    } catch (error) {
      console.error('Error removing from queue:', error)
    }
  }

  const handleDragStart = (e, index) => {
    setDraggedItem(index)
    e.dataTransfer.effectAllowed = 'move'
    // Prevent click event during drag
    e.currentTarget.style.pointerEvents = 'none'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault()
    // Restore pointer events
    if (e.currentTarget) {
      e.currentTarget.style.pointerEvents = 'auto'
    }
    
    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null)
      return
    }

    const newItems = [...queueItems]
    const [removed] = newItems.splice(draggedItem, 1)
    newItems.splice(dropIndex, 0, removed)

    // Update queue_order for all items
    const itemOrders = {}
    newItems.forEach((item, index) => {
      itemOrders[item.id] = index + 1
    })

    try {
      await reorderQueue(itemOrders)
      setQueueItems(newItems)
    } catch (error) {
      console.error('Error reordering queue:', error)
      loadQueue() // Reload on error
    }

    setDraggedItem(null)
  }

  const handleDragEnd = (e) => {
    // Restore pointer events if drag was cancelled
    if (e.currentTarget) {
      e.currentTarget.style.pointerEvents = 'auto'
    }
    setDraggedItem(null)
  }

  if (loading) {
    return null
  }

  if (queueItems.length === 0) {
    return null
  }

  const jellyfinBaseUrl = config.jellyfin_base_url || ''
  const jellyseerrBaseUrl = config.jellyseerr_base_url || ''

  const handleCardClick = (item) => {
    if (item.is_available && item.jellyfin_item_id) {
      // Open in Jellyfin
      window.open(`${jellyfinBaseUrl}/web/index.html#!/details?id=${item.jellyfin_item_id}`, '_blank', 'noopener,noreferrer')
    } else {
      // Redirect to Jellyseerr
      window.open(`${jellyseerrBaseUrl}/${item.media_type}/${item.tmdb_id}`, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="mb-6 sm:mb-8">
      <div className="mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-medium text-text-primary">Up Next</h2>
      </div>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide flex-nowrap w-full">
        {queueItems.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onClick={(e) => {
              // Only handle click if not dragging
              if (draggedItem === null) {
                handleCardClick(item)
              }
            }}
            className="flex-shrink-0 w-32 sm:w-40 bg-[#17131D] rounded-lg overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-all cursor-pointer group"
          >
            <div className="relative aspect-[2/3]">
              {item.poster_path ? (
                <img
                  src={item.poster_path}
                  alt={item.title}
                  onError={(e) => {
                    e.target.src = '/placeholder.svg'
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src="/placeholder.svg"
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              )}
              {/* Remove button - top right */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(item.id)
                }}
                className="absolute top-1.5 right-1.5 w-6 h-6 sm:w-7 sm:h-7 bg-black/70 backdrop-blur-sm text-text-primary border-none rounded-full flex items-center justify-center cursor-pointer transition-all hover:bg-black/90 active:bg-black touch-manipulation opacity-0 group-hover:opacity-100 z-10"
                aria-label="Remove from queue"
              >
                <HiXMark className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 sm:p-2.5">
              <h3 className="text-xs sm:text-sm font-medium text-text-primary mb-0.5 sm:mb-1 line-clamp-2">
                {item.title}
              </h3>
              <span className="text-[10px] sm:text-xs text-text-secondary">
                {item.release_date ? item.release_date.substring(0, 4) : 'N/A'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UpNextBanner

