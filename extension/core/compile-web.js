// The claude.ai stylesheet (browser extension and Claude Desktop injector).

import { logoSvg } from './art.js'
import { hslTriplet, mix } from './color.js'
import { iconSvg } from './iconset.js'
import { renderPattern, svgDataUri } from './patterns.js'

/**
 * claude.ai (and Claude Desktop, which loads it) colors itself from Tailwind
 * tokens held as HSL triplets on :root (--bg-100: "60 2.7% 14.5%"). Overriding
 * them recolors the whole app; the decorations ride on <html>/<body> pseudo-
 * elements and on dividers, so they survive markup changes. Everything is
 * scoped to html[data-chameleon]: removing the attribute restores stock.
 *
 * These token names are claude.ai internals, not a public API: they live in
 * this one function so a change on claude.ai is a one-place fix.
 */
export function toClaudeAiCss(theme) {
  const p = theme.palette
  const dark = theme.mode === 'dark'
  const deeper = mix(p.bg, dark ? '#000000' : '#ffffff', 0.35)
  const t = hslTriplet
  const tokens = {
    '--bg-000': t(dark ? p.surfaceAlt : '#ffffff'),
    '--bg-100': t(p.bg),
    '--bg-200': t(p.surface),
    '--bg-300': t(dark ? deeper : p.surfaceAlt),
    '--bg-400': t(dark ? mix(deeper, '#000000', 0.3) : mix(p.surfaceAlt, '#000000', 0.06)),
    '--bg-500': t(dark ? mix(deeper, '#000000', 0.5) : mix(p.surfaceAlt, '#000000', 0.12)),
    '--text-000': t(p.text),
    '--text-100': t(p.text),
    '--text-200': t(mix(p.text, p.textMuted, 0.4)),
    '--text-300': t(p.textMuted),
    '--text-400': t(mix(p.textMuted, p.bg, 0.25)),
    '--text-500': t(mix(p.textMuted, p.bg, 0.4)),
    '--border-100': t(p.border),
    '--border-200': t(p.border),
    '--border-300': t(p.border),
    '--border-400': t(mix(p.border, p.text, 0.2)),
    '--accent-brand': t(p.accent),
    '--accent-main-000': t(mix(p.accent, dark ? '#ffffff' : '#000000', 0.12)),
    '--accent-main-100': t(p.accent),
    '--accent-main-200': t(mix(p.accent, dark ? '#000000' : '#ffffff', 0.12)),
    '--accent-main-900': t(mix(p.accent, p.bg, 0.85)),
    '--accent-secondary-000': t(p.accent2),
    '--accent-secondary-100': t(p.accent2),
    '--accent-secondary-200': t(mix(p.accent2, p.bg, 0.2)),
    '--accent-secondary-900': t(mix(p.accent2, p.bg, 0.85)),
    '--danger-000': t(p.negative),
    '--danger-100': t(p.negative),
    '--danger-200': t(mix(p.negative, p.bg, 0.2)),
    '--danger-900': t(mix(p.negative, p.bg, 0.85)),
    '--oncolor-100': t('#ffffff'),
  }
  const vars = Object.entries(tokens).map(([k, v]) => `  ${k}: ${v} !important;`).join('\n')

  const strip = renderPattern(theme.pattern, p)
  const lineH = Math.max(strip.height, 18)
  const band = Math.min(strip.height, 12)
  const icon = i => svgDataUri(iconSvg(theme.icons[i % theme.icons.length], { color: p.accent, size: 18, stroke: 1.75 }))
  // The line runs up to a gap on each side of the ornament: two long copies of
  // the strip, cropped (not stretched) to half the width each, so the gap is
  // truly empty and sits right on whatever background the page has there.
  const half = side => svgDataUri(longStrip(strip, side))
  const divider = i =>
    `url("${icon(i)}") center / 18px 18px no-repeat, ` +
    `url("${half('left')}") left center / calc(50% - 22px) ${strip.height}px no-repeat, ` +
    `url("${half('right')}") right center / calc(50% - 22px) ${strip.height}px no-repeat`
  const sel = 'html[data-chameleon]'

  return `/* chameleon: ${theme.name} (${theme.motif}, ${theme.pattern}) */
${sel}, ${sel} :root, ${sel} .dark, ${sel} [data-theme] {
${vars}
  color-scheme: ${theme.mode};
  accent-color: ${p.accent};
}
/* line styles: dividers become the project's pattern, with an icon ornament */
${sel} hr, ${sel} [role="separator"] {
  border: 0 !important;
  height: ${lineH}px !important;
  margin-block: 14px !important;
  background: ${divider(0)} !important;
}
${sel} hr:nth-of-type(3n+2), ${sel} [role="separator"]:nth-of-type(3n+2) { background: ${divider(1)} !important; }
${sel} hr:nth-of-type(3n+3), ${sel} [role="separator"]:nth-of-type(3n+3) { background: ${divider(2)} !important; }
/* the project's line style as a band along the top of the window */
${sel} body::before {
  content: ""; position: fixed; z-index: 2147483000; pointer-events: none;
  left: 0; right: 0; top: 0; height: ${band}px; opacity: .9;
  background: url("${svgDataUri(strip.svg)}") left center / auto ${band}px repeat-x;
}
/* logo badge */
${sel} body::after {
  content: ""; position: fixed; z-index: 2147483000; pointer-events: none;
  right: 16px; bottom: 16px; width: 36px; height: 36px;
  background: url("${svgDataUri(logoSvg(theme, 72))}") center / contain no-repeat;
  filter: drop-shadow(0 4px 10px rgba(0,0,0,.28));
}
${sel} ::selection { background: ${p.accent}${dark ? '55' : '40'}; }
${sel} :focus-visible { outline-color: ${p.accent} !important; }
${sel} * { scrollbar-color: ${p.border} transparent; }
`
}

/** A 2400px run of the strip that crops from one side instead of scaling. */
function longStrip(strip, side) {
  const inner = strip.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
  const align = side === 'left' ? 'xMinYMid' : 'xMaxYMid'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 ${strip.height}" preserveAspectRatio="${align} slice">` +
    `<defs><pattern id="t" patternUnits="userSpaceOnUse" width="${strip.width}" height="${strip.height}">${inner}</pattern></defs>` +
    `<rect width="2400" height="${strip.height}" fill="url(#t)"/></svg>`
}
