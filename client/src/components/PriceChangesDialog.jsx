import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import StaffFields from './StaffFields.jsx'
import { StaffAuthError, fetchPriceChanges, getStaff, signInStaff, rememberName, rememberedName } from '../api.js'
import { formatNaira, formatUnit } from '../format.js'

const SOURCE_LABELS = { edit: 'Edited', added: 'Added', 'price-list': 'Price list' }

const when = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' })

export default function PriceChangesDialog({ open, onClose, onSignedIn }) {
  return (
    <Modal open={open} onClose={onClose} title="Price changes" titleId="price-changes-title" className="modal-wide">
      <PriceChanges onSignedIn={onSignedIn} />
    </Modal>
  )
}

function PriceChanges({ onSignedIn }) {
  const [signedIn, setSignedIn] = useState(() => Boolean(getStaff()))
  const [staff, setStaffFields] = useState({ pin: '', name: rememberedName() })
  const [pinError, setPinError] = useState(null)
  const [changes, setChanges] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    fetchPriceChanges()
      .then((rows) => !cancelled && setChanges(rows))
      .catch((err) => {
        if (cancelled) return
        if (err instanceof StaffAuthError) {
          setSignedIn(false)
          setPinError(err.message)
        } else {
          setError('The change log couldn’t be loaded. Try again in a moment.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [signedIn])

  async function handleSignIn(e) {
    e.preventDefault()
    setPinError(null)
    try {
      const signIn = { pin: staff.pin.trim(), name: staff.name.trim() }
      await signInStaff(signIn)
      rememberName(signIn.name)
      onSignedIn?.()
      setSignedIn(true)
    } catch (err) {
      setPinError(err instanceof StaffAuthError ? err.message : 'Couldn’t reach the server. Try again in a moment.')
    }
  }

  if (!signedIn) {
    return (
      <form className="modal-form" onSubmit={handleSignIn}>
        <p className="modal-lede">The change log is for staff. Enter the staff PIN to see it.</p>
        <StaffFields value={staff} onChange={setStaffFields} error={pinError} idPrefix="log" />
        <div className="modal-actions">
          <button type="submit" className="btn-primary">
            Show price changes
          </button>
        </div>
      </form>
    )
  }

  if (error) return <p className="modal-lede">{error}</p>
  if (!changes) return <p className="modal-lede">Loading…</p>
  if (changes.length === 0) {
    return <p className="modal-lede">No price changes yet. Edits, added items and price-list updates will appear here.</p>
  }

  return (
    <div className="changes-scroll">
      <table className="changes-table">
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Code</th>
            <th scope="col">Item</th>
            <th scope="col" className="num">
              Old
            </th>
            <th scope="col" className="num">
              New
            </th>
            <th scope="col">By</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.id}>
              <td className="changes-when">{when.format(new Date(c.changed_at))}</td>
              <td className="cell-code">{c.code}</td>
              <td>
                {c.description}
                <span className="row-category">
                  {SOURCE_LABELS[c.source] || c.source} · {formatUnit(c.unit)}
                </span>
              </td>
              <td className="num changes-old">{c.old_price == null ? '—' : formatNaira(c.old_price)}</td>
              <td className="num changes-new">{formatNaira(c.new_price)}</td>
              <td>{c.changed_by}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
