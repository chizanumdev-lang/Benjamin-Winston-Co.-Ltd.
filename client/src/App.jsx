import { useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import Filters from './components/Filters.jsx'
import ProductGrid from './components/ProductGrid.jsx'
import AddProductModal from './components/AddProductModal.jsx'
import { fetchCategories, fetchProducts } from './api.js'
import { useDebouncedValue } from './hooks/useDebouncedValue.js'
import { useTheme } from './hooks/useTheme.js'

export default function App() {
  const { theme, toggleTheme } = useTheme()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [addModalOpen, setAddModalOpen] = useState(false)

  const debouncedSearch = useDebouncedValue(search, 200)

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {})
  }, [refreshKey])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchProducts({ q: debouncedSearch, category, sort })
      .then((data) => {
        if (!cancelled) {
          setProducts(data)
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

  function handleProductCreated() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Filters
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          sort={sort}
          onSortChange={setSort}
          categories={categories}
          onAddClick={() => setAddModalOpen(true)}
        />

        <p className="result-count">
          {loading ? 'Loading…' : `${products.length} product${products.length === 1 ? '' : 's'}`}
        </p>

        {error ? (
          <p className="empty-state">Could not load products: {error}</p>
        ) : (
          <ProductGrid products={products} />
        )}
      </main>
      <footer className="site-footer">
        <p>Prices are indicatory and subject to change. Prices exclude VAT and are ex-warehouse Festac.</p>
      </footer>
      <AddProductModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={handleProductCreated}
        categories={categories}
      />
    </>
  )
}
