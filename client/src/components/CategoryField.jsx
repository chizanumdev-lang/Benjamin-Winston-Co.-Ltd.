import { forwardRef, useEffect, useMemo, useState } from 'react'

const CategoryField = forwardRef(function CategoryField({ id, value, onChange, categories }, ref) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)

  const names = useMemo(() => categories.map((c) => c.category), [categories])

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return names
    return names.filter((name) => name.toLowerCase().includes(query))
  }, [names, value])

  const trimmed = value.trim()
  const isNewCategory = trimmed.length > 0 && !names.some((name) => name.toLowerCase() === trimmed.toLowerCase())

  useEffect(() => {
    setHighlighted(-1)
  }, [suggestions.length, open])

  function commit(name) {
    onChange(name)
    setOpen(false)
  }

  function handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        if (!suggestions.length) break
        e.preventDefault()
        setOpen(true)
        setHighlighted((h) => Math.min(h + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        if (!open || !suggestions.length) break
        e.preventDefault()
        setHighlighted((h) => Math.max(h - 1, 0))
        break
      case 'Enter':
        if (open && highlighted >= 0) {
          e.preventDefault()
          commit(suggestions[highlighted])
        } else {
          setOpen(false)
        }
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          setOpen(false)
        }
        break
      default:
        break
    }
  }

  return (
    <div
      className="combobox"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <input
        ref={ref}
        id={id}
        type="text"
        autoComplete="off"
        required
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={value}
        placeholder="e.g. Ansell Disco"
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="combobox-toggle"
        tabIndex={-1}
        aria-label="Show existing categories"
        onClick={() => setOpen((o) => !o)}
      >
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

      {open && (suggestions.length > 0 || isNewCategory) && (
        <ul className="select-listbox" role="listbox">
          {isNewCategory && (
            <li className="select-option combobox-hint" aria-disabled="true">
              "{trimmed}" will be added as a new category
            </li>
          )}
          {suggestions.map((name, index) => (
            <li
              key={name}
              role="option"
              aria-selected={name === value}
              className={`select-option${index === highlighted ? ' is-highlighted' : ''}${
                name === value ? ' is-selected' : ''
              }`}
              onMouseEnter={() => setHighlighted(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(name)}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})

export default CategoryField
