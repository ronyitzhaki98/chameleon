// Composed artwork built from the theme's real icons: the logo badge.

import { contrast, mix } from './color.js'
import { iconPaths } from './iconset.js'

/** An app-icon style badge: rounded square, accent gradient, the logo icon. */
export function logoSvg(theme, size = 64) {
  const p = theme.palette
  const from = p.accent
  const to = mix(p.accent, p.accent2, 0.55)
  // Unique ids: several badges can share one HTML page (the popup, the preview).
  const id = `ss-${theme.id}-${size}`
  const ink = contrast('#ffffff', mix(from, to, 0.5)) >= 2.6 ? '#ffffff' : mix(p.bg, '#000000', 0.4)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">` +
    `<defs><linearGradient id="${id}-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>` +
    `<linearGradient id="${id}-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".28"/><stop offset=".5" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>` +
    `<rect x="2" y="2" width="60" height="60" rx="15" fill="url(#${id}-b)"/>` +
    `<rect x="2" y="2" width="60" height="60" rx="15" fill="url(#${id}-s)"/>` +
    `<rect x="2.5" y="2.5" width="59" height="59" rx="14.5" fill="none" stroke="#ffffff" stroke-opacity=".18"/>` +
    `<g transform="translate(14 14) scale(1.5)">${iconPaths(theme.logoIcon, { color: ink, stroke: 1.9, filled: false })}</g>` +
    `</svg>`
}
