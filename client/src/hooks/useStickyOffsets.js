import { useEffect } from 'react'

// Publishes the heights of the sticky site header (--header-h) and the sticky
// search toolbar (--toolbar-h) so the table's headings can stick directly
// beneath them. The toolbar only counts while it is actually sticky (it isn't
// on narrow screens, where it would take up most of the viewport).
export function useStickyOffsets() {
  useEffect(() => {
    const root = document.documentElement
    const header = document.querySelector('.site-header')
    const toolbar = document.querySelector('.toolbar')
    const update = () => {
      root.style.setProperty('--header-h', `${header?.offsetHeight ?? 0}px`)
      const sticky = toolbar && getComputedStyle(toolbar).position === 'sticky'
      root.style.setProperty('--toolbar-h', `${sticky ? toolbar.offsetHeight : 0}px`)
    }
    update()
    const observer = new ResizeObserver(update)
    if (header) observer.observe(header)
    if (toolbar) observer.observe(toolbar)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])
}
