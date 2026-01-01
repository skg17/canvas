function FilterBar({ filters, onFilterChange }) {
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
    <div className="mt-6 sm:mt-8 mb-6 sm:mb-8">
      <div className="max-w-[1600px] mx-auto">
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
      </div>
    </div>
  )
}

export default FilterBar
