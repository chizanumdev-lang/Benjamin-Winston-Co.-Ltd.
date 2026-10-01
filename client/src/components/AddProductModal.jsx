import { useEffect, useRef, useState } from 'react'
import { StaffAuthError, createProduct, getStaff, signInStaff, rememberName, rememberedName } from '../api.js'
import StaffFields from './StaffFields.jsx'
import CategoryField from './CategoryField.jsx'
import { formatNaira, formatUnit } from '../format.js'

const EMPTY_FORM = { category: '', code: '', description: '', price: '', unit: 'each' }

export default function AddProductModal({ open, onClose, onCreated, categories }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const [staff, setStaffFields] = useState({ pin: '', name: '' })
  const [needsSignIn, setNeedsSignIn] = useState(true)
  const [pinError, setPinError] = useState(null)
  const keepEditingRef = useRef(null)
  const firstFieldRef = useRef(null)
  const dialogRef = useRef(null)
  const returnFocusRef = useRef(null)

  // A native modal <dialog> keeps focus inside the form, makes the page behind
  // it inert, and closes on Esc. Focus goes back to whatever opened it.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement
      setForm(EMPTY_FORM)
      setError(null)
      setConfirmingDiscard(false)
      setNeedsSignIn(!getStaff())
      setStaffFields({ pin: '', name: rememberedName() })
      setPinError(null)
      dialog.showModal()
      firstFieldRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  function handleClose() {
    onClose()
    returnFocusRef.current?.focus?.()
  }

  const priceValue = Number(form.price)
  const priceEntered = form.price !== '' && Number.isFinite(priceValue)
  const priceInvalid = priceEntered && priceValue <= 0
  const pricePreview = priceEntered && !priceInvalid ? formatNaira(priceValue) : ''

  const dirty = Object.keys(EMPTY_FORM).some((key) => form[key] !== EMPTY_FORM[key])

  // Esc, the backdrop, Cancel and ✕ all come through here: an unsaved entry
  // asks before it's thrown away.
  function requestClose() {
    if (dirty && !confirmingDiscard) setConfirmingDiscard(true)
    else dialogRef.current?.close()
  }

  useEffect(() => {
    if (confirmingDiscard) keepEditingRef.current?.focus()
  }, [confirmingDiscard])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setPinError(null)
    setSubmitting(true)
    // Reuse an existing category's exact spelling when only the case differs.
    const existing = categories.find((c) => c.category.toLowerCase() === form.category.trim().toLowerCase())
    try {
      if (needsSignIn) {
        const signIn = { pin: staff.pin.trim(), name: staff.name.trim() }
        await signInStaff(signIn)
        rememberName(signIn.name)
        setNeedsSignIn(false)
      }
      const saved = await createProduct({
        category: existing ? existing.category : form.category.trim(),
        code: form.code,
        description: form.description,
        price: Number(form.price),
        unit: form.unit || 'each',
      })
      onCreated(saved)
      dialogRef.current?.close()
    } catch (err) {
      if (err instanceof StaffAuthError) {
        setNeedsSignIn(true)
        setPinError(err.message)
        return
      }
      setError(
        err instanceof TypeError
          ? 'Couldn’t reach the server, so the item wasn’t added. Your entry is still here. Try again in a moment.'
          : `The item wasn’t added: ${err.message}.`,
      )
    } finally {
      setSubmitting(false)
    }
  }

  // A press on the dimmed backdrop lands on the <dialog> element itself.
  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="add-product-title"
      onClose={handleClose}
      onCancel={(e) => {
        if (dirty && !confirmingDiscard) {
          e.preventDefault()
          setConfirmingDiscard(true)
        }
      }}
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div className="modal-header">
        <h2 id="add-product-title">Add item</h2>
        <button type="button" className="modal-close" aria-label="Close" onClick={requestClose}>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <form className="modal-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Category</span>
          <CategoryField
            ref={firstFieldRef}
            id="new-category"
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
            min="0.01"
            step="0.01"
            required
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
            aria-invalid={priceInvalid || undefined}
            aria-describedby="new-price-preview"
          />
          <span
            id="new-price-preview"
            className={priceInvalid ? 'field-hint is-error' : 'field-hint'}
            aria-live="polite"
          >
            {priceInvalid ? (
              'The price must be more than ₦0.'
            ) : pricePreview ? (
              <>
                Shows as <strong>{pricePreview}</strong> {formatUnit(form.unit) || 'each'}
              </>
            ) : (
              'Enter the price in naira, without commas.'
            )}
          </span>
        </label>

        {needsSignIn && (
          <StaffFields value={staff} onChange={setStaffFields} error={pinError} idPrefix="add" />
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {confirmingDiscard ? (
          <div className="modal-actions is-confirming" role="alert">
            <span className="confirm-text">Discard this unsaved item?</span>
            <button
              type="button"
              className="btn-secondary"
              ref={keepEditingRef}
              onClick={() => setConfirmingDiscard(false)}
            >
              Keep editing
            </button>
            <button type="button" className="btn-danger" onClick={() => dialogRef.current?.close()}>
              Discard
            </button>
          </div>
        ) : (
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={requestClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add item'}
            </button>
          </div>
        )}
      </form>
    </dialog>
  )
}
