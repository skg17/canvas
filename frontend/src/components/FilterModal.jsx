import { HiXMark, HiMagnifyingGlass, HiFunnel } from 'react-icons/hi2'

function FilterModal({ isOpen, onClose, filters, onFilterChange, searchValue, onSearchChange }) {
  if (!isOpen) return null

  const FilterBarGroup = ({ options, filterKey }) => {
    return (
      <div className="flex bg-[#1C1824] rounded-lg p-1 gap-1 min-w-[200px] w-full">
        {options.map(({ value, label }) => {
          const isActive = filters[filterKey] === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange({ [filterKey]: value })}
              className={`h-9 px-3 sm:px-4 rounded-md text-sm font-medium transition-all flex-1 whitespace-nowrap touch-manipulation ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary active:text-text-primary'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className="fixed z-[1000] left-0 top-0 w-full h-full bg-black/60 overflow-y-auto backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#17131D] my-4 sm:my-8 mx-auto p-4 sm:p-6 rounded-xl max-w-2xl w-[95%] sm:w-[90%] max-h-[90vh] overflow-y-auto text-text-primary shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <HiFunnel className="text-accent text-lg sm:text-xl" />
            <h2 className="text-lg sm:text-xl text-text-primary font-medium">Filters</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary text-2xl sm:text-3xl font-medium cursor-pointer w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded hover:text-text-primary hover:bg-[#1F1A27] active:bg-[#1F1A27] transition-all touch-manipulation"
            aria-label="Close"
          >
            <HiXMark />
          </button>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <label className="text-sm font-medium text-text-secondary">Media Type</label>
            <FilterBarGroup
              filterKey="media_type"
              options={[
                { value: 'all', label: 'All' },
                { value: 'movie', label: 'Movies' },
                { value: 'tv', label: 'TV Shows' }
              ]}
            />
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <label className="text-sm font-medium text-text-secondary">Watch Status</label>
            <FilterBarGroup
              filterKey="watched"
              options={[
                { value: 'all', label: 'All' },
                { value: 'unwatched', label: 'Unwatched' },
                { value: 'watched', label: 'Watched' }
              ]}
            />
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <label className="text-sm font-medium text-text-secondary">Availability</label>
            <FilterBarGroup
              filterKey="availability"
              options={[
                { value: 'all', label: 'All' },
                { value: 'available', label: 'Available' },
                { value: 'missing', label: 'Missing' }
              ]}
            />
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <label className="text-sm font-medium text-text-secondary">Search</label>
            <form 
              className="flex items-center w-full"
              onSubmit={(e) => {
                e.preventDefault()
                onSearchChange(e.target.search.value)
              }}
            >
              <div className="relative w-full">
                <HiMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted text-sm pointer-events-none" />
                <input
                  type="text"
                  name="search"
                  placeholder="Search titles..."
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full h-[44px] sm:h-[38px] pl-10 pr-4 bg-[#1C1824] border-none rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all touch-manipulation"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FilterModal

