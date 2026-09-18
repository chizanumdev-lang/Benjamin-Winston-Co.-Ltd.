export default function Header({ theme, onToggleTheme }) {
  return (
    <header className="site-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">B&amp;W</span>
        <div>
          <h1>Benjamin &amp; Winston Co. Ltd.</h1>
          <p>Electrical &amp; Lighting Catalogue &mdash; Festac Town, Lagos</p>
        </div>
      </div>
      <button
        type="button"
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </header>
  )
}
