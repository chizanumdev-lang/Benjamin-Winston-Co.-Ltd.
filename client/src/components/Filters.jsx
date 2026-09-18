import Select from './Select.jsx'

const SORT_OPTIONS = [
  { value: '', label: 'Sort: Category' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
]

export default function Filters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
  categories,
  onAddClick,
}) {
  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...categories.map((c) => ({ value: c.category, label: `${c.category} (${c.count})` })),
  ]

  return (
    <div className="controls">
      <div className="search-field">
        <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          id="search"
          type="search"
          placeholder="Search by name, code, or category..."
          autoComplete="off"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <Select id="category" value={category} onChange={onCategoryChange} options={categoryOptions} />

      <Select id="sort" value={sort} onChange={onSortChange} options={SORT_OPTIONS} />

      <button type="button" className="btn-primary btn-add" onClick={onAddClick}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Add item
      </button>
    </div>
  )
}
