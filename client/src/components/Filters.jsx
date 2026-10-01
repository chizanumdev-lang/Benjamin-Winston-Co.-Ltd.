import { forwardRef } from 'react'
import Select from './Select.jsx'

const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Sort: Price, low to high' },
  { value: 'price_desc', label: 'Sort: Price, high to low' },
  { value: 'name_asc', label: 'Sort: Name, A–Z' },
  { value: 'name_desc', label: 'Sort: Name, Z–A' },
]

const Filters = forwardRef(function Filters(
  {
  search,
  onSearchChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
  categories,
  onAddClick,
  },
  searchRef,
) {
  // The default order is by category, or by best match while searching.
  const sortOptions = [
    { value: '', label: search.trim() ? 'Sort: Best match' : 'Sort: By category' },
    ...SORT_OPTIONS,
  ]

  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...categories.map((c) => ({ value: c.category, label: `${c.category} (${c.count})` })),
  ]

  return (
    <div className="controls">
      <div className="search-field">
        <label htmlFor="search" className="sr-only">
          Search the price list
        </label>
        <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          id="search"
          type="search"
          placeholder="Search item, size or code, e.g. 2.5mm twin"
          autoComplete="off"
          ref={searchRef}
          aria-keyshortcuts="/"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && search) {
              e.preventDefault()
              onSearchChange('')
            }
          }}
        />
        {!search && (
          <kbd className="search-shortcut" aria-hidden="true" title="Press / to search">
            /
          </kbd>
        )}
      </div>

      <Select id="category" label="Category" value={category} onChange={onCategoryChange} options={categoryOptions} />

      <Select id="sort" label="Sort order" value={sort} onChange={onSortChange} options={sortOptions} />

      <button type="button" className="btn-secondary btn-add" onClick={onAddClick}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Add item
      </button>
    </div>
  )
})

export default Filters
