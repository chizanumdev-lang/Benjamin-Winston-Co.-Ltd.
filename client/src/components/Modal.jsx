import { useEffect, useRef } from 'react'

// A native modal <dialog>: focus stays inside, the page behind is inert, Esc
// and the backdrop close it, and focus returns to whatever opened it.
export default function Modal({ open, onClose, title, titleId, className = '', children }) {
  const dialogRef = useRef(null)
  const returnFocusRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement
      dialog.showModal()
      const first = dialog.querySelector('[data-autofocus]') || dialog.querySelector('input, button:not(.modal-close)')
      first?.focus()
      first?.select?.()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={`modal ${className}`}
      aria-labelledby={titleId}
      onClose={() => {
        onClose()
        returnFocusRef.current?.focus?.()
      }}
      // A press on the dimmed backdrop lands on the <dialog> element itself.
      onMouseDown={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
    >
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="modal-close" aria-label="Close" onClick={() => dialogRef.current?.close()}>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {open && children}
    </dialog>
  )
}
