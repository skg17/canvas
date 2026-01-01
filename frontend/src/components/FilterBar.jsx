import { HiMagnifyingGlass } from 'react-icons/hi2'

function FilterBar({ filters, onFilterChange, searchValue, onSearchChange }) {
  const FilterBarGroup = ({ options, filterKey }) => {
    return (
      <div className="flex bg-[#1C1824] rounded-lg p-1 gap-1 min-w-[200px] w-full sm:w-auto">
        {options.map(({ value, label }) => {
          const isActive = filters[filterKey] === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange({ [filterKey]: value })}
              className={`h-9 sm:h-9 px-3 sm:px-4 rounded-md text-sm font-medium transition-all flex-1 whitespace-nowrap touch-manipulation ${
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
    <div className="sticky top-16 z-40 bg-[#0F0D12] py-3 sm:py-4 mb-6 sm:mb-8 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-white/5">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <FilterBarGroup
              filterKey="media_type"
              options={[
                { value: 'all', label: 'All' },
                { value: 'movie', label: 'Movies' },
                { value: 'tv', label: 'TV Shows' }
              ]}
            />
            
            <div className="hidden sm:block w-px h-9 bg-white/5"></div>
            
            <FilterBarGroup
              filterKey="watched"
              options={[
                { value: 'all', label: 'All' },
                { value: 'unwatched', label: 'Unwatched' },
                { value: 'watched', label: 'Watched' }
              ]}
            />
            
            <div className="hidden sm:block w-px h-9 bg-white/5"></div>
            
            <FilterBarGroup
              filterKey="availability"
              options={[
                { value: 'all', label: 'All' },
                { value: 'available', label: 'Available' },
                { value: 'missing', label: 'Missing' }
              ]}
            />
          </div>

          <form 
            className="flex items-center w-full sm:w-auto"
            onSubmit={(e) => {
              e.preventDefault()
              onSearchChange(e.target.search.value)
            }}
          >
            <div className="relative w-full sm:w-64">
              <HiMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted text-sm pointer-events-none" />
              <input
                type="text"
                name="search"
                placeholder="Search titles..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full h-[38px] pl-10 pr-4 bg-[#1C1824] border-none rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all touch-manipulation"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default FilterBar
