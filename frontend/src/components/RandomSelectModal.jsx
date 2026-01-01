import { useState, useEffect, useRef } from 'react'
import { HiXMark } from 'react-icons/hi2'
import { FaDice } from 'react-icons/fa'

function RandomSelectModal({ isOpen, onClose, onSelect, selectedItem, onAddToQueue, allItems }) {
  const [mediaType, setMediaType] = useState('all')
  const [watched, setWatched] = useState('all')
  const [availability, setAvailability] = useState('all')
  const [isSelecting, setIsSelecting] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [animationItem, setAnimationItem] = useState(null)
  const animationIntervalRef = useRef(null)

  useEffect(() => {
    if (selectedItem) {
      // Stop animation and show result
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
        animationIntervalRef.current = null
      }
      setIsSelecting(false)
      setShowResult(true)
      setAnimationItem(null)
    }
  }, [selectedItem])

  useEffect(() => {
    // Start animation when we're selecting and have items
    if (isSelecting && allItems && allItems.length > 0) {
      // Clear any existing interval first
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
      }
      // Start new animation
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * allItems.length)
        setAnimationItem(allItems[randomIndex])
      }, 100) // Change poster every 100ms
      
      animationIntervalRef.current = interval
    }
    
    // Cleanup interval on unmount or when isSelecting becomes false
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
        animationIntervalRef.current = null
      }
    }
  }, [allItems, isSelecting])

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setIsSelecting(false)
      setShowResult(false)
      setAnimationItem(null)
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
        animationIntervalRef.current = null
      }
    }
  }, [isOpen])

  const handleRandomSelect = () => {
    setIsSelecting(true)
    setShowResult(false)
    setAnimationItem(null)
    
    // Clear any existing animation
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current)
      animationIntervalRef.current = null
    }
    
    onSelect({
      media_type: mediaType,
      watched: watched,
      availability: availability
    })
  }

  const handleReroll = () => {
    handleRandomSelect()
  }

  const handleClose = () => {
    setShowResult(false)
    setIsSelecting(false)
    setAnimationItem(null)
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current)
      animationIntervalRef.current = null
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#17131D] rounded-lg shadow-xl w-full max-w-md mx-4 border border-white/10">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-medium text-text-primary">Random Selection</h2>
            <button
              onClick={handleClose}
              className="text-text-secondary hover:text-text-primary transition-colors touch-manipulation"
              aria-label="Close"
            >
              <HiXMark className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {isSelecting && !showResult ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              {animationItem ? (
                <>
                  <div className="flex justify-center mb-4 sm:mb-6">
                    <div className="w-32 sm:w-40 aspect-[2/3] rounded-lg overflow-hidden shadow-lg transition-opacity duration-75">
                      {animationItem.poster_path ? (
                        <img
                          src={animationItem.poster_path}
                          alt={animationItem.title}
                          onError={(e) => {
                            e.target.src = '/placeholder.svg'
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src="/placeholder.svg"
                          alt={animationItem.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-text-primary mb-1 sm:mb-2">
                    {animationItem.title}
                  </h3>
                  {animationItem.release_date && (
                    <p className="text-text-secondary text-sm sm:text-base">
                      {animationItem.release_date.substring(0, 4)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-4 sm:mb-6">
                    <FaDice className="w-full h-full text-accent animate-spin" />
                  </div>
                  <p className="text-text-secondary text-sm sm:text-base">Selecting random title...</p>
                </>
              )}
            </div>
          ) : showResult && selectedItem ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <p className="text-text-secondary text-sm sm:text-base mb-4 sm:mb-6">Your random selection:</p>
                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="w-32 sm:w-40 aspect-[2/3] rounded-lg overflow-hidden shadow-lg">
                    {selectedItem.poster_path ? (
                      <img
                        src={selectedItem.poster_path}
                        alt={selectedItem.title}
                        onError={(e) => {
                          e.target.src = '/placeholder.svg'
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src="/placeholder.svg"
                        alt={selectedItem.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-medium text-text-primary mb-1 sm:mb-2">
                  {selectedItem.title}
                </h3>
                {selectedItem.release_date && (
                  <p className="text-text-secondary text-sm sm:text-base">
                    {selectedItem.release_date.substring(0, 4)}
                  </p>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3 pt-2">
                <button
                  onClick={handleReroll}
                  className="flex-1 px-4 py-2.5 border border-[#8B6A9F]/50 text-[#B894D1] rounded-lg text-sm font-medium hover:bg-[#8B6A9F]/15 hover:border-[#B894D1]/70 active:bg-[#8B6A9F]/20 transition-all touch-manipulation min-h-[44px] flex items-center justify-center gap-2"
                >
                  <FaDice className="w-4 h-4" />
                  <span>Reroll</span>
                </button>
                <button
                  onClick={() => {
                    if (selectedItem && onAddToQueue) {
                      onAddToQueue(selectedItem.id)
                      handleClose()
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover active:bg-accent-active transition-all touch-manipulation min-h-[44px]"
                >
                  Add to Queue
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2 sm:mb-3">
                  Media Type
                </label>
                <div className="flex bg-[#1C1824] rounded-lg p-1 gap-1">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'movie', label: 'Movies' },
                    { value: 'tv', label: 'TV Shows' }
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMediaType(value)}
                      className={`flex-1 h-9 sm:h-10 px-3 sm:px-4 rounded-md text-sm font-medium transition-all touch-manipulation ${
                        mediaType === value
                          ? 'bg-accent text-white'
                          : 'text-text-secondary hover:text-text-primary active:text-text-primary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2 sm:mb-3">
                  Watch Status
                </label>
                <div className="flex bg-[#1C1824] rounded-lg p-1 gap-1">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'unwatched', label: 'Unwatched' },
                    { value: 'watched', label: 'Watched' }
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setWatched(value)}
                      className={`flex-1 h-9 sm:h-10 px-3 sm:px-4 rounded-md text-sm font-medium transition-all touch-manipulation ${
                        watched === value
                          ? 'bg-accent text-white'
                          : 'text-text-secondary hover:text-text-primary active:text-text-primary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2 sm:mb-3">
                  Availability
                </label>
                <div className="flex bg-[#1C1824] rounded-lg p-1 gap-1">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'available', label: 'Available' },
                    { value: 'missing', label: 'Missing' }
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAvailability(value)}
                      className={`flex-1 h-9 sm:h-10 px-3 sm:px-4 rounded-md text-sm font-medium transition-all touch-manipulation ${
                        availability === value
                          ? 'bg-accent text-white'
                          : 'text-text-secondary hover:text-text-primary active:text-text-primary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 border border-[#8B6A9F]/50 text-[#B894D1] rounded-lg text-sm font-medium hover:bg-[#8B6A9F]/15 hover:border-[#B894D1]/70 active:bg-[#8B6A9F]/20 transition-all touch-manipulation min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRandomSelect}
                  className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover active:bg-accent-active transition-all touch-manipulation min-h-[44px] flex items-center justify-center gap-2"
                >
                  <FaDice className="w-4 h-4" />
                  <span>Select Random</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RandomSelectModal

