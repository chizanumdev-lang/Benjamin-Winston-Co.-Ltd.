export async function fetchCategories() {
  const res = await fetch('/api/categories')
  if (!res.ok) throw new Error('Failed to load categories')
  return res.json()
}

export async function fetchProducts({ q, category, sort }) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (category) params.set('category', category)
  if (sort) params.set('sort', sort)

  const res = await fetch(`/api/products?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to load products')
  // "all": every word matched. "partial": closest matches, with the words
  // nothing matched in `unmatched`. "none": nothing matched any word.
  const match = res.headers.get('X-Search-Match') || 'all'
  const unmatched = decodeURIComponent(res.headers.get('X-Search-Unmatched') || '')
  return { products: await res.json(), match, unmatched }
}

export async function createProduct(product) {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `server responded ${res.status}`)
  }
  return res.json()
}
