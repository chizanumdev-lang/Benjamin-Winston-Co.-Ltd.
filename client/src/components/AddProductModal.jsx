import { useEffect, useRef, useState } from 'react'
import { createProduct } from '../api.js'
import CategoryField from './CategoryField.jsx'

const EMPTY_FORM = { category: '', code: '', description: '', price: '', unit: 'each' }

export default function AddProductModal({ open, onClose, onCreated, categories }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const firstFieldRef = useRef(null)

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM)
      setError(null)
      firstFieldRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const saved = await createProduct({
        category: form.category,
        code: form.code,
        description: form.description,
        price: Number(form.price),
        unit: form.unit || 'each',
      })
      onCreated(saved)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-product-title">
        <div className="modal-header">
          <h2 id="add-product-title">Add product</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Category</span>
            <CategoryField
              ref={firstFieldRef}
              id="category"
              value={form.category}
              onChange={(v) => update('category', v)}
              categories={categories}
            />
          </label>

          <label className="form-field">
            <span>Description</span>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="e.g. 18W LED Downlight"
            />
          </label>

          <div className="form-row">
            <label className="form-field">
              <span>Code (optional)</span>
              <input type="text" value={form.code} onChange={(e) => update('code', e.target.value)} />
            </label>

            <label className="form-field">
              <span>Unit</span>
              <input type="text" value={form.unit} onChange={(e) => update('unit', e.target.value)} />
            </label>
          </div>

          <label className="form-field">
            <span>Price (₦)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
