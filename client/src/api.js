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

// ---- Staff actions (PIN-protected) ----

const STAFF_KEY = 'bw-staff'

// The PIN and name are kept for this browser tab only (sessionStorage), so a
// shared counter PC forgets them when the tab is closed.
export function getStaff() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STAFF_KEY) || 'null')
    return stored?.pin && stored?.name ? stored : null
  } catch {
    return null
  }
}

export function setStaff(staff) {
  try {
    if (staff) sessionStorage.setItem(STAFF_KEY, JSON.stringify(staff))
    else sessionStorage.removeItem(STAFF_KEY)
  } catch {
    // storage unavailable: the PIN is asked for again next time
  }
}

const NAME_KEY = 'bw-staff-name'

// The name is remembered on this device to save typing; the PIN never is.
export function rememberedName() {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

export function rememberName(name) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // storage unavailable: the name is typed again next time
  }
}

export class StaffAuthError extends Error {}

async function staffRequest(url, { method = 'GET', body, staff = getStaff() } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Staff-Pin': staff?.pin || '',
      'X-Staff-Name': encodeURIComponent(staff?.name || ''),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) {
      setStaff(null)
      throw new StaffAuthError('That staff PIN is wrong.')
    }
    throw new Error(data.error || `server responded ${res.status}`)
  }
  return res.json()
}

// Verifies a PIN and name, and remembers them for this tab if they work.
export async function signInStaff(staff) {
  await staffRequest('/api/staff/check', { method: 'POST', body: {}, staff })
  setStaff(staff)
}

export function createProduct(product) {
  return staffRequest('/api/products', { method: 'POST', body: product })
}

export function updatePrice(id, price) {
  return staffRequest(`/api/products/${id}`, { method: 'PATCH', body: { price } })
}

export function fetchPriceChanges() {
  return staffRequest('/api/price-changes')
}
