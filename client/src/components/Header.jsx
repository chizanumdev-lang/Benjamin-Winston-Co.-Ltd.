export default function Header({ theme, onToggleTheme, staffName, onSignOut, onShowChanges }) {
  return (
    <header className="site-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">B&amp;W</span>
        <div>
          <h1>Benjamin &amp; Winston Co. Ltd.</h1>
          <p>Electrical &amp; Lighting Catalogue &mdash; Festac Town, Lagos</p>
        </div>
      </div>
      <div className="header-actions">
        {staffName && (
          <span className="staff-status">
            {staffName} ·{' '}
            <button type="button" className="link-button" onClick={onSignOut}>
              Sign out
            </button>
          </span>
        )}
        <button type="button" className="btn-secondary btn-small btn-changes" onClick={onShowChanges}>
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path
              d="M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4v4h4M12 7.5V12l3 2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="btn-changes-label">Price changes</span>
        </button>
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}
