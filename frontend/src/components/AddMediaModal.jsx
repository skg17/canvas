import { useState } from 'react'
import { searchMedia } from '../api/watchlist'

function AddMediaModal({ isOpen, onClose, onAdd, onSearch }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    try {
      const data = await onSearch(query, type)
      setResults(data.results || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Error searching. Please try again.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (result) => {
    try {
      await onAdd({
        tmdb_id: result.tmdb_id,
        title: result.title,
        media_type: result.media_type,
        poster_path: result.poster_path || '',
        overview: result.overview || '',
        release_date: result.release_date || result.year || '',
      })
      setQuery('')
      setResults([])
    } catch (err) {
      alert('Error adding item to watchlist')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed z-[1000] left-0 top-0 w-full h-full bg-black/60 overflow-y-auto backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-[#17131D] my-4 sm:my-8 mx-auto p-4 sm:p-6 rounded-xl max-w-4xl w-[95%] sm:w-[90%] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto text-text-primary shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl text-text-primary font-medium">Add Media</h2>
          <button
            onClick={onClose}
            className="text-text-secondary text-2xl sm:text-3xl font-medium cursor-pointer w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded hover:text-text-primary hover:bg-[#1F1A27] active:bg-[#1F1A27] transition-all touch-manipulation"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for movies or TV shows..."
              required
              className="flex-1 h-[44px] sm:h-[38px] px-4 border-none rounded-lg text-sm bg-[#1C1824] text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all touch-manipulation"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-[44px] sm:h-[38px] px-4 border-none rounded-lg text-sm bg-[#1C1824] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer transition-all touch-manipulation"
            >
              <option value="all">All</option>
              <option value="movie">Movies</option>
              <option value="tv">TV Shows</option>
            </select>
            <button
              type="submit"
              className="h-[44px] sm:h-[38px] px-4 border border-accent/30 text-accent rounded-lg text-sm font-medium hover:bg-accent/10 hover:border-accent/50 active:bg-accent/15 transition-all touch-manipulation"
            >
              Search
            </button>
          </div>
        </form>

        {loading && <p className="text-center py-4 text-text-secondary">Searching...</p>}
        {error && <p className="text-red-400 text-center p-4 text-sm">{error}</p>}
        {!loading && !error && results.length > 0 && (
          <div className="flex flex-col gap-3 sm:gap-4">
            {results.map((result) => (
              <div
                key={result.tmdb_id}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-[#1F1A27] hover:bg-[#252030] active:bg-[#252030] transition-colors"
              >
                <div className="result-poster w-full sm:w-24 sm:min-w-24 max-w-[150px] mx-auto sm:mx-0 overflow-hidden rounded-lg bg-[#1C1824]">
                  {result.poster_path ? (
                    <img
                      src={result.poster_path}
                      alt={result.title}
                      onError={(e) => {
                        e.target.src = '/placeholder.svg'
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img src="/placeholder.svg" alt={result.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg mb-2 text-text-primary font-medium">
                    {result.title} {result.year && `(${result.year})`}
                  </h3>
                  <p className="inline-block px-2.5 py-1 bg-[#1C1824] text-accent rounded-md text-[10px] mb-2 uppercase tracking-wider font-medium">
                    {result.media_type.toUpperCase()}
                  </p>
                  {result.overview && (
                    <p className="text-text-secondary text-sm mb-3 leading-relaxed line-clamp-3 sm:line-clamp-none">
                      {result.overview.length > 150 ? `${result.overview.substring(0, 150)}...` : result.overview}
                    </p>
                  )}
                  <button
                    onClick={() => handleAdd(result)}
                    className="w-full sm:w-auto px-4 py-2.5 border border-accent/30 text-accent rounded-lg text-sm font-medium hover:bg-accent/10 hover:border-accent/50 active:bg-accent/15 transition-all touch-manipulation min-h-[44px]"
                  >
                    Add to Watchlist
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && !error && results.length === 0 && query && (
          <p className="text-center py-8 text-text-secondary text-sm">
            No results found for "{query}". Try a different search term.
          </p>
        )}
      </div>
    </div>
  )
}

export default AddMediaModal
