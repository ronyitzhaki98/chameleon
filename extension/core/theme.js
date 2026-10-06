// The theme document every target compiles from, and how one is made safe.
//
// {
//   version: 1, id, name, idea, motif, mode: 'dark' | 'light',
//   palette: { bg, surface, surfaceAlt, text, textMuted, accent, accent2,
//              positive, negative, border },          // hex colors
//   pattern: one of PATTERN_IDS,                       // the "line style"
//   icons: [tabler icon name, ...],                    // icon set (real icons, core/iconset.js)
//   logoIcon: tabler icon name,                        // drawn as an app-icon badge (core/art.js)
//   glyphs: [emoji, ...],                              // icon set for terminals
//   createdAt
// }

import { ensureContrast, isHex, normalizeHex } from './color.js'
import { MOTIFS } from './motifs.js'
import { PATTERN_IDS } from './patterns.js'

export const PALETTE_KEYS = ['bg', 'surface', 'surfaceAlt', 'text', 'textMuted', 'accent', 'accent2', 'positive', 'negative', 'border']

function slug(text) {
  return String(text || 'theme').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'theme'
}

// Without the icon pack (the Claude Code plugin does not ship it), icon names
// are kept as given when they look like names; the web targets pass the real
// resolver from core/iconset.js.
const keepName = name => (typeof name === 'string' && /^[a-z0-9-]{1,60}$/.test(name) ? name : null)

/**
 * Fills gaps from the base motif, repairs colors and contrast, resolves icon
 * names: whatever comes in (a model's JSON, a hand-edited file), what comes out
 * is safe for every compiler.
 */
export function normalizeTheme(raw, { idea = '', fallbackMotif = 'default', resolveIcon = keepName } = {}) {
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
    icons: resolveIcons(input.icons, base.icons, resolveIcon),
    logoIcon: resolveIcon(input.logoIcon) || resolveIcon(Array.isArray(input.icons) ? input.icons[0] : '') || base.logoIcon,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : new Date().toISOString(),
  }
}

/** Up to six real, distinct icons; the motif's own fill any gap. */
function resolveIcons(wanted, fallback, resolveIcon) {
  const out = []
  for (const want of Array.isArray(wanted) ? wanted.slice(0, 10) : []) {
    const name = resolveIcon(want)
    if (name && !out.includes(name)) out.push(name)
  }
  for (const name of fallback) if (out.length < 4 && !out.includes(name)) out.push(name)
  return out.slice(0, 6)
}
