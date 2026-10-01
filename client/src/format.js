const whole = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })
const withKobo = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 })

// Whole-naira prices print without decimals; anything with kobo keeps both
// digits, so ₦1,250.50 is never silently shown as ₦1,251.
export function formatNaira(amount) {
  return Number.isInteger(amount) ? whole.format(amount) : withKobo.format(amount)
}

// One spelling for units the price list writes several ways:
// "per reel/100yds" and "per 100yds" -> "per 100 yd reel" / "per 100 yd",
// "per 100m reel" -> "per 100 m reel", "per meter" -> "per metre", "set" -> "per set".
export function formatUnit(unit) {
  const u = String(unit || '').trim()
  if (!u) return ''
  if (/^(each|set|pair)$/i.test(u)) return u.toLowerCase() === 'each' ? 'each' : `per ${u.toLowerCase()}`
  return u
    .replace(/\breel\/\s*(\d+)\s*yds?\b/i, '$1 yd reel')
    .replace(/(\d+)\s*yds?\b/gi, '$1 yd')
    .replace(/(\d+)\s*m\b/gi, '$1 m')
    .replace(/\bmeters?\b/gi, 'metre')
}
