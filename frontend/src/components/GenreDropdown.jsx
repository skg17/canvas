import { useState, useEffect, useRef } from 'react'
import { HiChevronDown, HiXMark } from 'react-icons/hi2'
import api from '../api/client'
import { getWatchlist } from '../api/watchlist'

function GenreDropdown({ selectedGenres, onGenresChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [genres, setGenres] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const loadGenres = async () => {
      setLoading(true)
      try {
        // Fetch all genres from TMDb
        const genresResponse = await api.get('/genres?media_type=all')
        const allGenres = genresResponse.data.genres || []
        
        // Fetch all watchlist items to get unique genre IDs
        const watchlistResponse = await getWatchlist({})
        const watchlistItems = watchlistResponse.items || []
        
        // Extract unique genre IDs from watchlist items
        const watchlistGenreIds = new Set()
        watchlistItems.forEach(item => {
          if (item.genres) {
            const genreIds = item.genres.split(',').map(id => id.trim()).filter(id => id)
            genreIds.forEach(id => watchlistGenreIds.add(id))
          }
        })
        
        // Filter genres to only include those in the watchlist
        const filteredGenres = allGenres.filter(genre => 
          watchlistGenreIds.has(String(genre.id))
        )
        
        setGenres(filteredGenres)
      } catch (error) {
        console.error('Error loading genres:', error)
      } finally {
        setLoading(false)
      }
    }
    loadGenres()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  const filteredGenres = genres.filter(genre =>
    genre.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleGenre = (genreId) => {
    const genreIdStr = String(genreId)
    if (selectedGenres.includes(genreIdStr)) {
      onGenresChange(selectedGenres.filter(id => id !== genreIdStr))
    } else {
      onGenresChange([...selectedGenres, genreIdStr])
    }
  }

  const removeGenre = (e, genreId) => {
    e.stopPropagation()
    const genreIdStr = String(genreId)
    onGenresChange(selectedGenres.filter(id => id !== genreIdStr))
  }

  const selectedGenreNames = genres
    .filter(g => selectedGenres.includes(String(g.id)))
    .map(g => g.name)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 sm:h-9 px-3 sm:px-4 rounded-lg text-sm font-medium transition-all touch-manipulation flex items-center gap-2 bg-[#1C1824] min-w-[200px] ${
          selectedGenres.length > 0
            ? 'text-text-primary'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        <span className="flex-1 text-left truncate">
          {selectedGenres.length > 0
            ? `${selectedGenres.length} selected`
            : 'Select Genres'}
        </span>
        <HiChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-[#1F1A27] rounded-lg shadow-xl border border-white/5 z-50 max-h-80 flex flex-col">
          {/* Search input */}
          <div className="p-2 border-b border-white/5">
            <input
              type="text"
              placeholder="Search genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 px-3 bg-[#17131D] border-none rounded text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
              autoFocus
            />
          </div>

          {/* Selected genres chips */}
          {selectedGenreNames.length > 0 && (
            <div className="p-2 border-b border-white/5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {selectedGenreNames.map((name) => {
                const genre = genres.find(g => g.name === name)
                return (
                  <span
                    key={genre.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-accent/20 text-accent text-xs rounded"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={(e) => removeGenre(e, genre.id)}
                      className="hover:text-accent-hover"
                    >
                      <HiXMark className="w-3 h-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          {/* Genre list */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-text-secondary text-sm">Loading...</div>
            ) : filteredGenres.length > 0 ? (
              <div className="p-1">
                {filteredGenres.map((genre) => {
                  const isSelected = selectedGenres.includes(String(genre.id))
                  return (
                    <button
                      key={genre.id}
                      type="button"
                      onClick={() => toggleGenre(genre.id)}
                      className={`w-full text-left px-3 py-2 text-sm rounded transition-colors touch-manipulation ${
                        isSelected
                          ? 'bg-accent/20 text-accent'
                          : 'text-text-secondary hover:text-text-primary hover:bg-[#17131D]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-white/20 bg-[#17131D] text-accent focus:ring-accent/30"
                        />
                        <span>{genre.name}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-text-secondary text-sm">
                No genres found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default GenreDropdown

