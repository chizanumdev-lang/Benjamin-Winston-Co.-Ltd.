import { useState } from 'react'
import ProductTable from './ProductTable.jsx'

// Closest-match lists are capped so a loose search doesn't bury the best rows.
const CLOSEST_LIMIT = 20

export default function ProductResults({
  products,
  loading,
  partial,
  query,
  category,
  grouped,
  newId,
  onEdit,
  onClearSearch,
  onClearCategory,
}) {
  const [showAllFor, setShowAllFor] = useState(null)
  const showAll = showAllFor === query

  if (products.length === 0 && !loading) {
    return (
      <div className="empty-state">
        <p className="empty-title">
          {query ? <>Nothing matches “{query}”{category && <> in {category}</>}.</> : <>No products in {category || 'the catalogue'}.</>}
        </p>
        {query && <p>Try fewer words, a size like “2.5mm”, or a product code.</p>}
        {query && <p>Not on the price list? Check with pricing staff before quoting.</p>}
        <div className="empty-actions">
          {query && (
            <button type="button" className="btn-secondary" onClick={onClearSearch}>
              Clear search
            </button>
          )}
          {category && (
            <button type="button" className="btn-secondary" onClick={onClearCategory}>
              Search all categories
            </button>
          )}
        </div>
      </div>
    )
  }

  const capped = partial && !showAll && products.length > CLOSEST_LIMIT
  const visible = capped ? products.slice(0, CLOSEST_LIMIT) : products

  return (
    <div className="results" aria-busy={loading}>
      <ProductTable
        products={visible}
        grouped={grouped}
        showCategory={!grouped && !category}
        newId={newId}
        onEdit={onEdit}
      />
      {capped && (
        <div className="results-more">
          <button type="button" className="btn-secondary" onClick={() => setShowAllFor(query)}>
            Show all {products.length} closest matches
          </button>
        </div>
      )}
    </div>
  )
}
