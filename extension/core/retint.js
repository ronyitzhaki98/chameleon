// Retints whatever color tokens a page actually has, instead of relying on a
// fixed list of names. claude.ai runs two token systems at once (hex `--cds-*`
// on <html>, legacy `H S% L%` triplets like `--bg-100`, plus `--df-*` on frame
// elements), and their names change between releases. So the content script
// reads the live tokens and this module maps each one:
//
//   - neutrals (surfaces, text, borders, gray ramps) keep their place in the
//     app's lightness scale and take the theme's hue, so the whole UI shifts;
//   - accent / danger / success / warning tokens take the theme's colors;
//   - other strongly colored tokens (syntax, charts) are left alone.
//
// Every value is written back in the format it was read in, because the app
// wraps triplets as hsl(var(--x)) and uses hex tokens directly.

import { contrast, hexToHsl, hexToRgb, hslToHex, rgbToHex } from './color.js'

// --- OKLCH (perceptual lightness, so retinting keeps the app's contrast) ---

const toLinear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

export function rgbToOklch({ r, g, b }) {
  const [R, G, B] = [r, g, b].map(v => toLinear(v / 255))
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const Bv = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.hypot(A, Bv)
  const H = ((Math.atan2(Bv, A) * 180) / Math.PI + 360) % 360
  return { L, C, H }
}

function oklchToLinear({ L, C, H }) {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

/** OKLCH to sRGB, lowering chroma until the color fits the gamut. */
export function oklchToRgb({ L, C, H }) {
  let c = C
  for (let i = 0; i < 24; i++) {
    const lin = oklchToLinear({ L, C: c, H })
    if (lin.every(v => v >= -0.0005 && v <= 1.0005) || c < 0.0005) {
      const [r, g, b] = lin.map(v => Math.round(Math.max(0, Math.min(1, toGamma(Math.max(0, v)))) * 255))
      return { r, g, b }
    }
    c *= 0.88
  }
  return { r: 0, g: 0, b: 0 }
}

// --- reading and writing token values in their own format ---

const NUM = '(-?\\d*\\.?\\d+)'

/** Parses a token value: { rgb, alpha, format, ... } or null when not a color. */
export function parseColor(raw) {
  const value = String(raw || '').trim()
  let m
  if ((m = value.match(/^#([0-9a-f]{3,8})$/i))) {
    let hex = m[1]
    if (hex.length === 3 || hex.length === 4) hex = hex.split('').map(c => c + c).join('')
    if (hex.length !== 6 && hex.length !== 8) return null
    const alpha = hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1
    return { format: 'hex', rgb: hexToRgb(`#${hex.slice(0, 6)}`), alpha }
  }
  // Bare "H S% L%" (optionally "/ a"), what the legacy tokens hold.
  if ((m = value.match(new RegExp(`^${NUM}(?:deg)?\\s+${NUM}%\\s+${NUM}%\\s*(?:/\\s*${NUM}(%?))?$`)))) {
    const rgb = hexToRgb(hslToHex({ h: +m[1], s: +m[2], l: +m[3] }))
    return { format: 'triplet', rgb, alpha: m[4] ? (m[5] ? +m[4] / 100 : +m[4]) : 1, hasAlpha: Boolean(m[4]) }
  }
  if ((m = value.match(new RegExp(`^rgba?\\(\\s*${NUM}[\\s,]+${NUM}[\\s,]+${NUM}\\s*(?:[,/]\\s*${NUM}(%?))?\\s*\\)$`, 'i')))) {
    return { format: 'rgb', rgb: { r: +m[1], g: +m[2], b: +m[3] }, alpha: m[4] ? (m[5] ? +m[4] / 100 : +m[4]) : 1 }
  }
  if ((m = value.match(new RegExp(`^hsla?\\(\\s*${NUM}(?:deg)?[\\s,]+${NUM}%[\\s,]+${NUM}%\\s*(?:[,/]\\s*${NUM}(%?))?\\s*\\)$`, 'i')))) {
    return { format: 'hsl', rgb: hexToRgb(hslToHex({ h: +m[1], s: +m[2], l: +m[3] })), alpha: m[4] ? (m[5] ? +m[4] / 100 : +m[4]) : 1 }
  }
  if ((m = value.match(new RegExp(`^oklch\\(\\s*${NUM}(%?)\\s+${NUM}\\s+${NUM}(?:deg)?\\s*(?:/\\s*${NUM}(%?))?\\s*\\)$`, 'i')))) {
    const L = m[2] ? +m[1] / 100 : +m[1]
    return { format: 'oklch', rgb: oklchToRgb({ L, C: +m[3], H: +m[4] }), alpha: m[5] ? (m[6] ? +m[5] / 100 : +m[5]) : 1 }
  }
  return null
}

export function formatColor(rgb, { format, alpha = 1, hasAlpha = false }) {
  const a = Math.round(alpha * 1000) / 1000
  if (format === 'hex') {
    const hex = rgbToHex(rgb)
    return a < 1 ? hex + Math.round(a * 255).toString(16).padStart(2, '0') : hex
  }
  if (format === 'triplet' || format === 'hsl') {
    const { h, s, l } = hexToHsl(rgbToHex(rgb))
    const body = `${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%`
    if (format === 'triplet') return hasAlpha ? `${body} / ${a}` : body
    return a < 1 ? `hsl(${body} / ${a})` : `hsl(${body})`
  }
  if (format === 'oklch') {
    const { L, C, H } = rgbToOklch(rgb)
    return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(2)}${a < 1 ? ` / ${a}` : ''})`
  }
  return `rgb(${rgb.r} ${rgb.g} ${rgb.b}${a < 1 ? ` / ${a}` : ''})`
}

// --- roles ---

export function tokenRole(name) {
  const n = name.toLowerCase()
  if (/oncolor|on-accent|on-brand|text-on-|-on-fill/.test(n)) return 'onAccent'
  if (/danger|error|destructive|critical|-red-?/.test(n)) return 'negative'
  if (/success|positive|-green-?/.test(n)) return 'positive'
  if (/warning|caution|-yellow-?|-amber-?/.test(n)) return 'warning'
  if (/accent|brand|focus|clay|kraft|book-cloth|fill-primary|-link/.test(n)) return 'accent'
  return 'other'
}

const REFERENCE = {
  canvas: ['--cds-surface-0', '--bg-100', '--df-bg-page'],
  text: ['--cds-text-primary', '--text-100', '--text-000'],
  accent: ['--cds-fill-accent', '--accent-brand', '--brand-100', '--accent-main-100', '--accent-100'],
}

function reference(tokens, names) {
  for (const n of names) {
    const c = tokens[n] && parseColor(tokens[n])
    if (c) return rgbToOklch(c.rgb)
  }
  return null
}

/**
 * @param {Record<string, string>} tokens the page's own values, as read
 * @param {object} theme a normalized theme
 * @returns {Record<string, string>} the overrides, only for tokens that change
 */
export function retintTokens(tokens, theme) {
  const p = theme.palette
  const t = name => rgbToOklch(hexToRgb(p[name]))
  const themeBg = t('bg')
  const themeText = t('text')
  const themeAccent = t('accent')

  const stockCanvas = reference(tokens, REFERENCE.canvas)
  const stockText = reference(tokens, REFERENCE.text)
  const stockAccent = reference(tokens, REFERENCE.accent)
  const pageIsDark = stockCanvas ? stockCanvas.L < 0.5 : theme.mode === 'dark'

  // When the page and the theme agree on light/dark, stretch the app's
  // lightness scale onto the theme's (canvas -> theme bg, text -> theme text).
  // When they disagree, keep the app's lightness and only take the hue.
  const sameMode = pageIsDark === (theme.mode === 'dark')
  const mapL = L => {
    if (!sameMode || !stockCanvas || !stockText || Math.abs(stockText.L - stockCanvas.L) < 0.2) return L
    const k = (themeText.L - themeBg.L) / (stockText.L - stockCanvas.L)
    return Math.max(0, Math.min(1, themeBg.L + (L - stockCanvas.L) * k))
  }
  const neutralChroma = Math.min(0.05, Math.max(0.012, themeBg.C * 1.3))
  const neutral = L => {
    const hue = L < 0.5 ? themeBg.H : themeText.H
    return { L, C: neutralChroma * 4 * L * (1 - L), H: hue }
  }
  const accentShift = stockAccent ? themeAccent.L - stockAccent.L : 0
  const inkOnAccent = contrast('#ffffff', p.accent) >= 3 ? null : p.bg

  const out = {}
  for (const [name, value] of Object.entries(tokens)) {
    const color = parseColor(value)
    if (!color) continue
    const stock = rgbToOklch(color.rgb)
    const role = tokenRole(name)
    let next
    if (role === 'onAccent') {
      if (!inkOnAccent || stock.L < 0.6) continue
      next = hexToRgb(inkOnAccent)
    } else if (role === 'accent' && stock.C > 0.03) {
      next = oklchToRgb({ L: Math.max(0, Math.min(1, stock.L + accentShift)), C: themeAccent.C, H: themeAccent.H })
    } else if (role === 'negative' || role === 'positive' || role === 'warning') {
      if (stock.C < 0.03) continue
      const target = t(role === 'warning' ? 'accent2' : role)
      next = oklchToRgb({ L: stock.L, C: Math.max(stock.C, target.C * 0.9), H: target.H })
    } else if (stock.C < 0.06) {
      next = oklchToRgb(neutral(mapL(stock.L)))
    } else {
      continue
    }
    const written = formatColor(next, color)
    if (written !== value.trim()) out[name] = written
  }
  return out
}
