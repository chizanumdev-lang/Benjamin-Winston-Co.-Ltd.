import { useState } from 'react'
import Modal from './Modal.jsx'
import StaffFields from './StaffFields.jsx'
import { StaffAuthError, getStaff, signInStaff, updatePrice, rememberName, rememberedName } from '../api.js'
import { formatNaira, formatUnit } from '../format.js'

export default function EditPriceDialog({ product, onClose, onSaved }) {
  return (
    <Modal open={Boolean(product)} onClose={onClose} title="Edit price" titleId="edit-price-title">
      {product && <EditPriceForm key={product.id} product={product} onSaved={onSaved} />}
    </Modal>
  )
}

function EditPriceForm({ product, onSaved }) {
  const [price, setPrice] = useState(String(product.price))
  const [staff, setStaffFields] = useState(() => getStaff() || { pin: '', name: rememberedName() })
  const [needsSignIn, setNeedsSignIn] = useState(() => !getStaff())
  const [error, setError] = useState(null)
  const [pinError, setPinError] = useState(null)
  const [saving, setSaving] = useState(false)

  const value = Number(price)
  const entered = price !== '' && Number.isFinite(value)
  const invalid = entered && value <= 0
  const unchanged = entered && value === product.price
  // A new price far from the old one is usually a slipped zero.
  const bigJump = entered && !invalid && product.price > 0 && (value / product.price >= 2 || value / product.price <= 0.5)

  async function handleSubmit(e) {
    e.preventDefault()
    if (invalid || unchanged) return
    setError(null)
    setPinError(null)
    setSaving(true)
    try {
      if (needsSignIn) {
        const signIn = { pin: staff.pin.trim(), name: staff.name.trim() }
        await signInStaff(signIn)
        rememberName(signIn.name)
        setNeedsSignIn(false)
      }
      const saved = await updatePrice(product.id, value)
      onSaved(saved)
    } catch (err) {
      if (err instanceof StaffAuthError) {
        setNeedsSignIn(true)
        setPinError(err.message)
      } else {
        setError(
          err instanceof TypeError
            ? 'Couldn’t reach the server, so the price wasn’t changed. Try again in a moment.'
            : `The price wasn’t changed: ${err.message}.`,
        )
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <div className="edit-item">
        <span className="edit-code">{product.code || 'No code'}</span>
        <span className="edit-desc">{product.description}</span>
        <span className="edit-category">{product.category}</span>
      </div>

      <dl className="edit-current">
        <dt>Current price</dt>
        <dd>
          {formatNaira(product.price)} <span>{formatUnit(product.unit)}</span>
        </dd>
      </dl>

      <label className="form-field">
        <span>New price (₦)</span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          required
          data-autofocus
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby="edit-price-hint"
        />
        <span
          id="edit-price-hint"
          className={invalid ? 'field-hint is-error' : bigJump ? 'field-hint is-warning' : 'field-hint'}
          aria-live="polite"
        >
          {invalid
            ? 'The price must be more than ₦0.'
            : !entered
              ? 'Enter the price in naira, without commas.'
              : unchanged
                ? 'This is the current price.'
                : (
                    <>
                      {formatNaira(product.price)} → <strong>{formatNaira(value)}</strong> {formatUnit(product.unit)}
                      {bigJump && ` · that’s ${value > product.price ? 'over double' : 'under half'} the current price, check the zeros`}
                    </>
                  )}
        </span>
      </label>

      {needsSignIn && <StaffFields value={staff} onChange={setStaffFields} error={pinError} idPrefix="edit" />}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="modal-actions">
        <button type="submit" className="btn-primary" disabled={saving || invalid || unchanged || !entered}>
          {saving ? 'Saving…' : 'Save price'}
        </button>
      </div>
    </form>
  )
}
