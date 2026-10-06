// The theme document every target compiles from, and how one is made safe.
//
// {
//   version: 1, id, name, idea, motif, mode: 'dark' | 'light',
//   palette: { bg, surface, surfaceAlt, text, textMuted, accent, accent2,
//              positive, negative, border },          // hex colors
//   pattern: one of PATTERN_IDS,                       // the "line style"
//   glyphs: [emoji, ...],                              // icon set
//   logo: '<svg ...>',                                 // sanitized, 32x32 viewBox
//   createdAt
// }

import { ensureContrast, isHex, normalizeHex } from './color.js'
import { MOTIFS } from './motifs.js'
import { PATTERN_IDS } from './patterns.js'

export const PALETTE_KEYS = ['bg', 'surface', 'surfaceAlt', 'text', 'textMuted', 'accent', 'accent2', 'positive', 'negative', 'border']

/**
 * Keeps only drawing elements and attributes in an SVG, so a model-made logo
 * can never carry script, event handlers, external references or foreignObject.
 */
export function sanitizeSvg(input) {
  if (typeof input !== 'string') return null
  const text = input.trim()
  if (!/^<svg[\s>]/i.test(text) || !/<\/svg>\s*$/i.test(text) || text.length > 8000) return null
  const allowedTags = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'defs', 'lineargradient', 'radialgradient', 'stop'])
  const allowedAttrs = new Set(['xmlns', 'viewbox', 'width', 'height', 'd', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform', 'id', 'offset', 'stop-color', 'stop-opacity', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'gradientunits'])
  let ok = true
  const out = text.replace(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g, (_, close, tag, attrs, self) => {
    const name = tag.toLowerCase()
    if (!allowedTags.has(name)) {
      ok = false
      return ''
    }
    if (close) return `</${tag}>`
    const kept = []
    for (const m of attrs.matchAll(/([a-zA-Z][\w:-]*)\s*=\s*("[^"]*"|'[^']*')/g)) {
      const attr = m[1].toLowerCase()
      const value = m[2].slice(1, -1)
      if (!allowedAttrs.has(attr)) continue
      if (/url\s*\(|javascript:|data:|&#|\\/i.test(value)) continue
      kept.push(`${m[1]}="${value.replace(/"/g, '')}"`)
    }
    return `<${tag}${kept.length ? ' ' + kept.join(' ') : ''}${self}>`
  })
  if (!ok || /<!|<\?|&(?!amp;|lt;|gt;|quot;)/i.test(out.replace(/<[^>]*>/g, ''))) return null
  return out
}

function slug(text) {
  return String(text || 'theme').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'theme'
}

/**
 * Fills gaps from the base motif, repairs colors and contrast, sanitizes the
 * logo: whatever comes in (a model's JSON, a hand-edited file), what comes out
 * is safe for every compiler.
 */
export function normalizeTheme(raw, { idea = '', fallbackMotif = 'default' } = {}) {
  const input = raw && typeof raw === 'object' ? raw : {}
  const motifId = MOTIFS[input.motif] ? input.motif : fallbackMotif
  const base = MOTIFS[motifId] || MOTIFS.default
  const mode = input.mode === 'light' || input.mode === 'dark' ? input.mode : base.mode

  const palette = {}
  for (const key of PALETTE_KEYS) {
    const value = input.palette?.[key]
    palette[key] = isHex(value) ? normalizeHex(value) : base.palette[key]
  }
  palette.text = ensureContrast(palette.text, palette.bg, 7)
  palette.textMuted = ensureContrast(palette.textMuted, palette.bg, 4.5)
  palette.accent = ensureContrast(palette.accent, palette.bg, 3)

  const glyphs = Array.isArray(input.glyphs)
    ? input.glyphs.filter(g => typeof g === 'string' && g.length > 0 && g.length <= 8).slice(0, 8)
    : []

  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim().slice(0, 40) : base.name

  return {
    version: 1,
    id: typeof input.id === 'string' && /^[a-z0-9-]{1,48}$/.test(input.id) ? input.id : slug(name),
    name,
    idea: String(input.idea || idea || '').slice(0, 500),
    motif: motifId,
    mode,
    palette,
    pattern: PATTERN_IDS.includes(input.pattern) ? input.pattern : base.pattern,
    glyphs: glyphs.length ? glyphs : base.glyphs,
    logo: sanitizeSvg(input.logo) || base.logo,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : new Date().toISOString(),
  }
}
