import { HiFunnel, HiArrowRightOnRectangle } from 'react-icons/hi2'
import { FaDice } from 'react-icons/fa'

function Navbar({ onAddClick, onFilterClick, onRandomClick, onLogout }) {
  return (
    <nav className="sticky top-0 z-50 bg-[#17131D] border-b border-white/5">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <img 
            src="/logo.png" 
            alt="canvas" 
            className="h-8 sm:h-10 w-auto"
          />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {onRandomClick && (
            <button
              onClick={onRandomClick}
              className="px-3 sm:px-4 py-2 h-9 border border-[#8B6A9F]/50 text-[#B894D1] rounded-lg text-sm font-medium hover:bg-[#8B6A9F]/15 hover:border-[#B894D1]/70 active:bg-[#8B6A9F]/20 transition-all touch-manipulation flex items-center justify-center"
              aria-label="Random selection"
            >
              <FaDice className="w-4 h-4" />
            </button>
          )}
          {onFilterClick && (
            <button
              onClick={onFilterClick}
              className="px-3 sm:px-4 py-2 h-9 border border-[#8B6A9F]/50 text-[#B894D1] rounded-lg text-sm font-medium hover:bg-[#8B6A9F]/15 hover:border-[#B894D1]/70 active:bg-[#8B6A9F]/20 transition-all touch-manipulation flex items-center justify-center"
              aria-label="Filter"
            >
              <HiFunnel className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onAddClick}
            className="px-3 sm:px-4 py-2 h-9 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover active:bg-accent-active transition-all touch-manipulation"
          >
            + Add Media
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 sm:px-4 py-2 h-9 border border-[#8B6A9F]/50 text-[#B894D1] rounded-lg text-sm font-medium hover:bg-[#8B6A9F]/15 hover:border-[#B894D1]/70 active:bg-[#8B6A9F]/20 transition-all touch-manipulation flex items-center gap-2"
              aria-label="Logout"
            >
              <HiArrowRightOnRectangle className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
