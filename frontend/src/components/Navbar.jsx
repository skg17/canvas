function Navbar({ onAddClick }) {
  return (
    <nav className="sticky top-0 z-50 bg-[#17131D] border-b border-white/5">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-accent text-lg sm:text-xl">⊞</span>
          <h1 className="text-lg sm:text-xl font-medium text-text-primary">
            canvas
          </h1>
        </div>
        <button
          onClick={onAddClick}
          className="px-3 sm:px-4 py-2 h-9 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover active:bg-accent-active transition-all touch-manipulation"
        >
          + Add Media
        </button>
      </div>
    </nav>
  )
}

export default Navbar
