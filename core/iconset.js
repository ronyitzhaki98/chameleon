// Real icons for themes, offline and free: the Tabler set (MIT, ~4,800 icons)
// bundled in core/icons/tabler.js. The model (or the keyword fallback) names
// icons or describes them; resolveIcon() finds the closest real one.

import { FILLED, INDEX, OUTLINE } from './icons/tabler.js'

const STOP = new Set(['the', 'and', 'for', 'with', 'icon', 'app', 'want', 'build', 'software', 'make', 'that', 'this', 'from', 'into', 'like', 'some'])

function tokens(text) {
  return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w))
}

/** Icon names ranked for a free-text query ("film camera", "bull market"). */
export function searchIcons(query, limit = 8) {
  const q = String(query || '').toLowerCase().trim().replace(/\s+/g, '-')
  const words = tokens(query)
  if (!q && !words.length) return []
  const scored = []
  for (const [name, tags] of Object.entries(INDEX)) {
    let score = 0
    let matched = 0
    if (name === q) score += 100
    const parts = name.split('-')
    for (const w of words) {
      const before = score
      if (parts.includes(w)) score += 10
      else if (name.includes(w)) score += 4
      if (` ${tags} `.includes(` ${w} `)) score += 3
      if (score > before) matched++
    }
    // Most of what was asked for must match; plain names beat variants (movie over movie-off).
    if (score >= 100 || (score > 0 && matched * 2 >= words.length)) {
      scored.push([score - parts.length * 0.5 - (/-off$/.test(name) ? 6 : 0), name])
    }
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map(([, name]) => name)
}

/** A real icon name for a name-or-description, or null. */
export function resolveIcon(want) {
  if (typeof want !== 'string') return null
  const name = want.trim().toLowerCase().replace(/^tabler[:/-]?/, '').replace(/\s+/g, '-')
  if (name.startsWith('brand-')) return null
  if (OUTLINE[name]) return name
  return searchIcons(want, 1)[0] || null
}

/** The icon as an SVG string. Outline icons are strokes; filled are fills. */
export function iconSvg(name, { color = 'currentColor', size = 24, stroke = 1.75, filled = false } = {}) {
  const useFilled = filled && FILLED[name]
  const d = (useFilled ? FILLED[name] : OUTLINE[name]) || OUTLINE.question
  const paths = d.split('|').map(p => `<path d="${p}"/>`).join('')
  const paint = useFilled
    ? `fill="${color}" stroke="none"`
    : `fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" ${paint}>${paths}</svg>`
}

/** Just the icon's drawing, to place inside another SVG. */
export function iconPaths(name, { color, stroke = 1.75, filled = false }) {
  const useFilled = filled && FILLED[name]
  const d = (useFilled ? FILLED[name] : OUTLINE[name]) || OUTLINE.question
  const paint = useFilled
    ? `fill="${color}"`
    : `fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"`
  return `<g ${paint}>${d.split('|').map(p => `<path d="${p}"/>`).join('')}</g>`
}
