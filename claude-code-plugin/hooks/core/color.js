// Small color helpers. Pure functions, no DOM, no Node: shared by every target.

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function isHex(value) {
  return typeof value === 'string' && HEX.test(value)
}

export function normalizeHex(value, fallback = '#888888') {
  if (!isHex(value)) return fallback
  let hex = value.slice(1).toLowerCase()
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  return `#${hex}`
}

export function hexToRgb(hex) {
  const n = parseInt(normalizeHex(hex).slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function hexToHsl(hex) {
  let { r, g, b } = hexToRgb(hex)
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return { h, s: s * 100, l: l * 100 }
}

export function hslToHex({ h, s, l }) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgbToHex({ r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 })
}

/** "H S% L%" triplet, the format claude.ai's Tailwind tokens hold. */
export function hslTriplet(hex) {
  const { h, s, l } = hexToHsl(hex)
  return `${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%`
}

/** Mixes two colors; t = 0 gives a, t = 1 gives b. */
export function mix(a, b, t) {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  return rgbToHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t })
}

export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  const ch = v => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

export function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Nudges `fg` lighter or darker until it reads on `bg` at `min` contrast. */
export function ensureContrast(fg, bg, min = 4.5) {
  let color = normalizeHex(fg)
  const towards = luminance(bg) > 0.5 ? '#000000' : '#ffffff'
  for (let i = 0; i < 20 && contrast(color, bg) < min; i++) color = mix(color, towards, 0.15)
  return color
}
