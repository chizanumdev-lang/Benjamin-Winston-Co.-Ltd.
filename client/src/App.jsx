import { useEffect, useRef, useState } from 'react'
import Header from './components/Header.jsx'
import Filters from './components/Filters.jsx'
import ProductResults from './components/ProductResults.jsx'
import AddProductModal from './components/AddProductModal.jsx'
import { fetchCategories, fetchProducts } from './api.js'
import { useDebouncedValue } from './hooks/useDebouncedValue.js'
import { useTheme } from './hooks/useTheme.js'
import { useStickyOffsets } from './hooks/useStickyOffsets.js'
import { PRICE_LIST_DATE } from './priceList.js'

function readParam(name) {
  return new URLSearchParams(window.location.search).get(name) || ''
}

export default function App() {
  const { theme, toggleTheme } = useTheme()
  useStickyOffsets()

  // Search, category and sort live in the URL so a refresh or a shared link
  // keeps the same view.
  const [search, setSearch] = useState(() => readParam('q'))
  const [category, setCategory] = useState(() => readParam('category'))
  const [sort, setSort] = useState(() => readParam('sort'))
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [searchMatch, setSearchMatch] = useState({ match: 'all', unmatched: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [added, setAdded] = useState(null)

  const searchRef = useRef(null)
  const debouncedSearch = useDebouncedValue(search, 200)
  const filtersActive = Boolean(search || category || sort)

  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
    if (category) params.set('category', category)
    if (sort) params.set('sort', sort)
    const query = params.toString()
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname)
  }, [debouncedSearch, category, sort])

  // A new search, category or sort starts at the top of the results, so the
  // first rows and any closest-match note are never hidden under the toolbar.
  const firstQuery = useRef(true)
  useEffect(() => {
    if (firstQuery.current) {
      firstQuery.current = false
      return
    }
    if (window.scrollY > 0) window.scrollTo({ top: 0 })
  }, [debouncedSearch, category, sort])

  // Counter use is keyboard-first: the cursor starts in search (on devices with
  // a pointer, so phones don't pop the keyboard), and "/" jumps back to it.
  useEffect(() => {
    if (window.matchMedia?.('(pointer: fine)').matches) searchRef.current?.focus()
  }, [])

  useEffect(() => {
    if (addModalOpen) return
    function handleKeyDown(e) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target
      if (target.closest?.('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [addModalOpen])

  function clearAll() {
    setSearch('')
    setCategory('')
    setSort('')
    searchRef.current?.focus()
  }

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {})
  }, [refreshKey])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchProducts({ q: debouncedSearch, category, sort })
      .then(({ products, match, unmatched }) => {
        if (!cancelled) {
          setProducts(products)
          setSearchMatch({ match, unmatched })
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedSearch, category, sort, refreshKey])

  function handleProductCreated(saved) {
    setAdded(saved)
    setRefreshKey((k) => k + 1)
  }

  // Show the new item in its category, highlighted.
  function showAdded() {
    setSearch('')
    setSort('')
    setCategory(added.category)
  }

  // Bring a newly added row into view once it appears in the results.
  useEffect(() => {
    if (!added || loading) return
    const row = document.querySelector(`[data-product-id="${added.id}"]`)
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [added, loading, products])

  useEffect(() => {
    if (!added) return
    const timer = setTimeout(() => setAdded(null), 10000)
    return () => clearTimeout(timer)
  }, [added])

  return (
    <>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <div className="toolbar">
          <Filters
            ref={searchRef}
            search={search}
            onSearchChange={setSearch}
            category={category}
            onCategoryChange={setCategory}
            sort={sort}
            onSortChange={setSort}
            categories={categories}
            onAddClick={() => setAddModalOpen(true)}
          />

          <div className="results-bar">
            <div className="results-meta">
              {!error && (
                <p className="result-count">
                  {loading ? 'Loading…' : `${products.length} product${products.length === 1 ? '' : 's'}`}
                </p>
              )}
              {/* Announced once results settle, not on every keystroke pause. */}
              <span className="sr-only" aria-live="polite">
                {loading || error ? '' : `${products.length} product${products.length === 1 ? '' : 's'}`}
              </span>
              {filtersActive && (
                <button type="button" className="link-button" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>
            <p className="price-basis">
              Price list of <strong>{PRICE_LIST_DATE}</strong> · Light fittings exclude tubes/lamps unless stated
            </p>
          </div>
        </div>

        {!loading && searchMatch.match === 'partial' && (
          <p className="search-notice" role="status">
            {searchMatch.unmatched ? (
              <>
                Nothing matches every word. Showing the closest matches, without{' '}
                <strong>“{searchMatch.unmatched}”</strong>.
              </>
            ) : (
              'No single item matches every word. Showing the closest matches.'
            )}
          </p>
        )}

        {error ? (
          <div className="empty-state" role="alert">
            <p className="empty-title">Prices can’t be loaded right now.</p>
            <p>Use the printed price list dated {PRICE_LIST_DATE} for now, and try again in a moment.</p>
            <div className="empty-actions">
              <button type="button" className="btn-secondary" onClick={() => setRefreshKey((k) => k + 1)}>
                Try again
              </button>
            </div>
          </div>
        ) : (
          <ProductResults
            products={products}
            loading={loading}
            partial={searchMatch.match === 'partial'}
            query={debouncedSearch.trim()}
            category={category}
            grouped={!sort && !debouncedSearch.trim()}
            newId={added?.id}
            onClearSearch={() => {
              setSearch('')
              searchRef.current?.focus()
            }}
            onClearCategory={() => setCategory('')}
          />
        )}
      </main>
      <footer className="site-footer">
        <p>
          This price list is indicatory. Prices are subject to change at any time due to exchange-rate
          fluctuation. Confirm price validity before any order is placed.
        </p>
      </footer>
      <div className="toast-region" role="status" aria-live="polite">
        {added && (
          <div className="toast">
            <span>
              Added <strong>{added.description}</strong> to {added.category}.
            </span>
            {category !== added.category && (
              <button type="button" className="link-button" onClick={showAdded}>
                Show it
              </button>
            )}
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => setAdded(null)}>
              <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <AddProductModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={handleProductCreated}
        categories={categories}
      />
    </>
  )
}
