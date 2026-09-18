import { useEffect, useRef, useState } from 'react'

export default function Select({ id, value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const rootRef = useRef(null)
  const listRef = useRef(null)

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : ''

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (open) setHighlighted(selectedIndex >= 0 ? selectedIndex : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.querySelector(`[data-index="${highlighted}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [open, highlighted])

  function commit(index) {
    const option = options[index]
    if (option) onChange(option.value)
    setOpen(false)
  }

  function handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) setOpen(true)
        else setHighlighted((h) => Math.min(h + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) setOpen(true)
        else setHighlighted((h) => Math.max(h - 1, 0))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open) commit(highlighted)
        else setOpen(true)
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          setOpen(false)
        }
        break
      case 'Home':
        if (open) {
          e.preventDefault()
          setHighlighted(0)
        }
        break
      case 'End':
        if (open) {
          e.preventDefault()
          setHighlighted(options.length - 1)
        }
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div className="select" ref={rootRef}>
      <button
        type="button"
        id={id}
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
      >
        <span className="select-trigger-label">{selectedLabel}</span>
        <svg className="select-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <polyline
            points="6 9 12 15 18 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul className="select-listbox" role="listbox" ref={listRef} tabIndex={-1}>
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              data-index={index}
              className={`select-option${index === highlighted ? ' is-highlighted' : ''}${
                option.value === value ? ' is-selected' : ''
              }`}
              onMouseEnter={() => setHighlighted(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
