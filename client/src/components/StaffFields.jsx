// Staff PIN and name, shown in a form until this tab has signed in.
export default function StaffFields({ value, onChange, error, idPrefix }) {
  return (
    <fieldset className="staff-fields">
      <legend>Staff only</legend>
      <div className="form-row">
        <label className="form-field">
          <span>Staff PIN</span>
          <input
            id={`${idPrefix}-pin`}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            required
            value={value.pin}
            onChange={(e) => onChange({ ...value, pin: e.target.value })}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${idPrefix}-pin-error` : undefined}
          />
        </label>
        <label className="form-field">
          <span>Your name</span>
          <input
            type="text"
            autoComplete="name"
            required
            maxLength={60}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </label>
      </div>
      <span className="field-hint">Your name goes in the price change log.</span>
      {error && (
        <span id={`${idPrefix}-pin-error`} className="field-hint is-error" role="alert">
          {error}
        </span>
      )}
    </fieldset>
  )
}
