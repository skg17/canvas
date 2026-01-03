import { useState, useEffect } from 'react'
import { HiXMark, HiPlay, HiStar, HiCalendar, HiClock, HiLanguage, HiArrowDownTray, HiFilm } from 'react-icons/hi2'
import { RiPlayListAddLine } from 'react-icons/ri'
import { getMediaDetails } from '../api/watchlist'

function MediaDetailModal({ isOpen, onClose, item, config, onAddToQueue, onWatchNow }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && item) {
      // Use cached data from item if available, otherwise fetch from API
      if (item.runtime !== null && item.runtime !== undefined && item.rating) {
        // Use cached data - only need to fetch genre names
        loadGenreNames()
      } else {
        // Fetch all details from API
        loadDetails()
      }
    } else {
      setDetails(null)
      setError(null)
    }
  }, [isOpen, item])

  const loadGenreNames = async () => {
    if (!item) return
    setLoading(true)
    setError(null)
    try {
      // Get genre names from API (genres are stored as IDs in item.genres)
      // The API will return cached data from database
      const data = await getMediaDetails(item.tmdb_id, item.media_type)
      setDetails(data)
    } catch (err) {
      console.error('Error loading genre names:', err)
      // Fallback to using item data without genre names
      setDetails({
        title: item.title,
        overview: item.overview || '',
        poster_path: item.poster_path || '',
        release_date: item.release_date || '',
        runtime: item.runtime,
        rating: item.rating ? parseFloat(item.rating) : 0,
        language: item.language || '',
        genres: [],
        media_type: item.media_type,
        tmdb_id: item.tmdb_id
      })
    } finally {
      setLoading(false)
    }
  }

  const loadDetails = async () => {
    if (!item) return
    setLoading(true)
    setError(null)
    try {
      const data = await getMediaDetails(item.tmdb_id, item.media_type)
      setDetails(data)
    } catch (err) {
      console.error('Error loading media details:', err)
      setError('Failed to load media details')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !item) return null

  const jellyseerrBaseUrl = config.jellyseerr_base_url || ''
  const jellyfinBaseUrl = config.jellyfin_base_url || ''

  const formatRuntime = (minutes) => {
    if (!minutes) return null
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const handleWatchNow = () => {
    if (item.is_available && item.jellyfin_item_id) {
      window.open(`${jellyfinBaseUrl}/web/index.html#!/details?id=${item.jellyfin_item_id}`, '_blank', 'noopener,noreferrer')
    } else {
      window.open(`${jellyseerrBaseUrl}/${item.media_type}/${item.tmdb_id}`, '_blank', 'noopener,noreferrer')
    }
    if (onWatchNow) onWatchNow()
  }

  const handleAddToQueue = () => {
    if (onAddToQueue) {
      onAddToQueue(item.id)
    }
  }

  return (
    <div
      className="fixed z-[1000] left-0 top-0 w-full h-full bg-black/60 overflow-y-auto backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="min-h-full flex items-center justify-center p-4 sm:p-8">
        <div className="bg-[#17131D] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-5xl w-full overflow-hidden flex flex-col sm:flex-row">
          {/* Left Column - Poster (40%) */}
          <div className="relative w-full sm:w-[40%] h-80 sm:h-auto bg-[#1C1824] flex-shrink-0">
            {item.poster_path ? (
              <img
                src={item.poster_path}
                alt={item.title}
                className="w-full h-full object-cover rounded-tl-3xl rounded-bl-3xl sm:rounded-tr-none sm:rounded-br-none"
                onError={(e) => {
                  e.target.src = '/placeholder.svg'
                }}
              />
            ) : (
              <img
                src="/placeholder.svg"
                alt={item.title}
                className="w-full h-full object-cover rounded-tl-3xl rounded-bl-3xl sm:rounded-tr-none sm:rounded-br-none"
              />
            )}
          </div>

          {/* Right Column - Content (60%) */}
          <div className="flex-1 bg-gradient-to-b from-[#17131D] to-[#1F1A27] p-6 sm:p-8 flex flex-col min-h-[400px] sm:min-h-0">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-text-secondary">Loading details...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-red-400">{error}</p>
              </div>
            ) : details ? (
              <>
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <h2 className="text-2xl sm:text-3xl font-bold text-text-primary pr-4 flex-1 leading-tight">
                    {details.title}
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-text-secondary hover:text-text-primary text-3xl font-light cursor-pointer w-8 h-8 flex items-center justify-center rounded hover:bg-[#1C1824] transition-all touch-manipulation flex-shrink-0"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-3 mb-5 text-sm text-text-muted">
                  {details.release_date && (
                    <span className="flex items-center gap-1.5">
                      <HiCalendar className="w-4 h-4" />
                      {details.release_date.substring(0, 4)}
                    </span>
                  )}
                  {details.runtime && (
                    <span className="flex items-center gap-1.5">
                      <HiClock className="w-4 h-4" />
                      {formatRuntime(details.runtime)}
                    </span>
                  )}
                  {details.rating > 0 && (
                    <span className="flex items-center gap-1.5">
                      <HiStar className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      {details.rating.toFixed(1)}
                    </span>
                  )}
                  {details.language && (
                    <span className="flex items-center gap-1.5">
                      <HiLanguage className="w-4 h-4" />
                      {details.language}
                    </span>
                  )}
                </div>

                {/* Genre Tags and Availability Badge */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {details.genres && details.genres.map((genre, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full text-xs border border-[#8B6A9F]/30 text-[#B894D1] bg-transparent"
                    >
                      {genre}
                    </span>
                  ))}
                  {/* Availability Badge - styled like genre tags */}
                  {item.is_available ? (
                    <span className="px-3 py-1 rounded-full text-xs border border-[#4ade80]/30 text-[#4ade80] bg-transparent">
                      Available
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs border border-[#f59e0b]/30 text-[#f59e0b] bg-transparent">
                      Missing
                    </span>
                  )}
                </div>

                {/* Synopsis */}
                {details.overview && (
                  <div className="mb-6 flex-1">
                    <h3 className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                      Synopsis
                    </h3>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {details.overview}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto flex flex-col sm:flex-row gap-3 pt-4 items-center">
                  {item.is_available && item.jellyfin_item_id ? (
                    <button
                      onClick={handleWatchNow}
                      className="flex-1 px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover active:bg-accent-active transition-all touch-manipulation flex items-center justify-center gap-2"
                    >
                      <HiPlay className="w-5 h-5" />
                      Watch Now
                    </button>
                  ) : (
                    <a
                      href={`${jellyseerrBaseUrl}/${item.media_type}/${item.tmdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-6 py-3 bg-[#d97706] text-white rounded-lg font-medium hover:bg-[#d97706]/90 active:bg-[#d97706]/80 transition-all touch-manipulation flex items-center justify-center gap-2 text-center no-underline"
                    >
                      <HiArrowDownTray className="w-5 h-5" />
                      Request
                    </a>
                  )}
                  {item.queue_order === null && (
                    <button
                      onClick={handleAddToQueue}
                      className="w-12 h-12 border border-[#8B6A9F]/50 text-[#B894D1] rounded-lg font-medium hover:bg-[#8B6A9F]/15 hover:border-[#B894D1]/70 active:bg-[#8B6A9F]/20 transition-all touch-manipulation flex items-center justify-center flex-shrink-0"
                      aria-label="Add to Queue"
                    >
                      <RiPlayListAddLine className="w-5 h-5" />
                    </button>
                  )}
                  {details.tmdb_id && (
                    <a
                      href={`https://www.themoviedb.org/${item.media_type}/${details.tmdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 border border-[#8B6A9F]/50 text-[#B894D1] rounded-lg font-medium hover:bg-[#8B6A9F]/15 hover:border-[#B894D1]/70 active:bg-[#8B6A9F]/20 transition-all touch-manipulation flex items-center justify-center text-center no-underline flex-shrink-0"
                      aria-label="Watch Trailer"
                    >
                      <HiFilm className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MediaDetailModal

