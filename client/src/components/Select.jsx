// A styled native <select>: keyboard type-ahead, screen-reader support and
// untruncated option lists come from the browser instead of custom code.
export default function Select({ id, label, value, onChange, options }) {
  return (
    <div className="select">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select id={id} className="select-trigger" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
    </div>
  )
}
