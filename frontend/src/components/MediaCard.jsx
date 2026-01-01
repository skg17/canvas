import { useState, useEffect } from 'react'
import { HiEye, HiEyeSlash, HiCheck, HiXMark, HiPlay, HiArrowDownTray, HiEllipsisHorizontal, HiFilm, HiTv } from 'react-icons/hi2'

function MediaCard({ item, config, onRemove, onToggleWatched }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const jellyseerrBaseUrl = config.jellyseerr_base_url || ''
  const jellyfinBaseUrl = config.jellyfin_base_url || ''

  // Close menu when clicking outside
  useEffect(() => {
    if (menuOpen) {
      const handleClickOutside = (e) => {
        if (!e.target.closest('.card-menu')) {
          setMenuOpen(false)
        }
      }
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [menuOpen])

  return (
    <div className="media-card bg-[#17131D] rounded-[14px] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
      <div className="card-poster relative w-full">
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
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors pointer-events-none"></div>
        <div className={`card-menu absolute top-2 right-2 sm:top-3 sm:right-3 z-10 ${menuOpen ? 'active' : ''}`}>
          <button
            className={`card-menu-toggle bg-black/70 backdrop-blur-sm text-text-primary border-none rounded-lg w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center cursor-pointer transition-all hover:bg-black/80 active:bg-black/90 touch-manipulation ${
              isMobile ? 'flex' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            aria-label="Menu"
          >
            <HiEllipsisHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="card-menu-dropdown absolute top-full right-0 mt-2 bg-[#1F1A27] rounded-lg shadow-xl min-w-[180px] flex-col overflow-hidden border border-white/5 p-1 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleWatched(item.id)
                setMenuOpen(false)
              }}
              className="w-full text-left px-3 py-2.5 sm:py-2 text-sm text-text-primary transition-colors hover:bg-[#17131D] active:bg-[#17131D] rounded touch-manipulation"
            >
              {item.is_watched ? 'Mark as Unwatched' : 'Mark as Watched'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(item.id)
                setMenuOpen(false)
              }}
              className="w-full text-left px-3 py-2.5 sm:py-2 text-sm text-red-400 transition-colors hover:bg-red-400/10 active:bg-red-400/10 rounded touch-manipulation"
            >
              Remove from List
            </button>
          </div>
        </div>
      </div>
      <div className="p-2 sm:p-4 bg-[#17131D]">
        <div className="mb-1.5 sm:mb-3">
          <h3 className="text-xs sm:text-base font-medium text-text-primary mb-0.5 sm:mb-1 line-clamp-1">
            {item.title}
          </h3>
          <span className="text-text-secondary text-[10px] sm:text-sm">
            {item.release_date ? item.release_date.substring(0, 4) : 'N/A'}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:gap-3 mb-2 sm:mb-4">
          <div className="flex flex-wrap gap-1.5 sm:gap-3 text-[10px] sm:text-xs">
            {item.is_available ? (
              <span className="text-[#4ade80] flex items-center gap-1">
                <HiCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="text-text-secondary">Available</span>
              </span>
            ) : (
              <span className="text-[#f59e0b] flex items-center gap-1">
                <HiXMark className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="text-text-secondary">Missing</span>
              </span>
            )}
            {item.media_type === 'movie' ? (
              <span className="text-text-secondary flex items-center gap-1">
                <HiFilm className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Movie</span>
              </span>
            ) : (
              <span className="text-text-secondary flex items-center gap-1">
                <HiTv className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>TV Show</span>
              </span>
            )}
          </div>
          <div className="text-[10px] sm:text-xs">
            {item.is_watched ? (
              <span className="text-text-secondary flex items-center gap-1">
                <HiEye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Watched</span>
              </span>
            ) : (
              <span className="text-text-secondary flex items-center gap-1">
                <HiEyeSlash className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Unwatched</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!item.is_available && (
            <a
              href={`${jellyseerrBaseUrl}/${item.media_type}/${item.tmdb_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center px-2 py-1.5 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-medium no-underline border border-[#f59e0b]/30 text-[#f59e0b] cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-[#f59e0b]/10 hover:border-[#f59e0b]/50 active:bg-[#f59e0b]/15 transition-all touch-manipulation min-h-[36px] sm:min-h-[44px]"
            >
              <HiArrowDownTray className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Request in Jellyseerr</span>
              <span className="sm:hidden">Request</span>
            </a>
          )}
          {item.is_available && item.jellyfin_item_id && (
            <a
              href={`${jellyfinBaseUrl}/web/index.html#!/details?id=${item.jellyfin_item_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center px-2 py-1.5 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-medium no-underline border border-[#8B6A9F]/50 text-[#B894D1] cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-[#8B6A9F]/15 hover:border-[#B894D1]/70 active:bg-[#8B6A9F]/20 transition-all touch-manipulation min-h-[36px] sm:min-h-[44px]"
            >
              <HiPlay className="w-3 h-3 sm:w-4 sm:h-4" />
              Watch Now
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default MediaCard
