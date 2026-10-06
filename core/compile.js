// Compilers: one theme document in, each target's native format out.

import { hslTriplet, mix } from './color.js'
import { TERMINAL_LINES, renderPattern, svgDataUri } from './patterns.js'

function logoWithColor(theme, color) {
  return theme.logo.replace(/currentColor/g, color)
}

function glyphWallpaper(theme) {
  const cells = theme.glyphs.slice(0, 5)
  const body = cells
    .map((g, i) => `<text x="${20 + (i % 3) * 60 + (i > 2 ? 30 : 0)}" y="${30 + Math.floor(i / 3) * 60}" font-size="22">${g}</text>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="120">${body}</svg>`
}

/**
 * The claude.ai web app (and Claude Desktop, which loads it) colors itself from
 * Tailwind tokens held as HSL triplets on :root (--bg-100: "60 2.7% 14.5%").
 * Overriding those recolors the whole app; the decorations ride on pseudo-
 * elements of <html>/<body> so they survive markup changes. Everything is
 * scoped to html[data-skinshift] so removing the attribute restores stock.
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
    '--oncolor-100': t(dark ? '#ffffff' : '#ffffff'),
  }
  const vars = Object.entries(tokens).map(([k, v]) => `  ${k}: ${v} !important;`).join('\n')

  const strip = renderPattern(theme.pattern, p)
  const stripUri = svgDataUri(strip.svg)
  const logoUri = svgDataUri(logoWithColor(theme, p.accent))
  const wallUri = svgDataUri(glyphWallpaper(theme))
  const sel = 'html[data-skinshift]'

  return `/* skinshift: ${theme.name} (${theme.motif}/${theme.pattern}) */
${sel}, ${sel} :root, ${sel} .dark, ${sel} [data-theme] {
${vars}
  color-scheme: ${theme.mode};
  --ct-accent: ${p.accent};
  --ct-strip: url("${stripUri}");
  --ct-strip-h: ${strip.height}px;
}
/* line styles: dividers become the project's pattern */
${sel} hr, ${sel} [role="separator"] {
  border: 0 !important;
  height: ${strip.height}px !important;
  background: var(--ct-strip) repeat-x center / auto ${strip.height}px !important;
  opacity: .9;
}
/* top band: the project's pattern across the window */
${sel} body::before {
  content: ""; position: fixed; z-index: 2147483000; pointer-events: none;
  left: 0; right: 0; top: 0; height: ${Math.min(strip.height, 8)}px;
  background: var(--ct-strip) repeat-x left center / auto ${Math.min(strip.height, 8)}px;
}
/* logo badge, bottom right */
${sel} body::after {
  content: ""; position: fixed; z-index: 2147483000; pointer-events: none;
  right: 14px; bottom: 14px; width: 34px; height: 34px; border-radius: 10px;
  background: ${p.surface} url("${logoUri}") no-repeat center / 22px 22px;
  box-shadow: 0 0 0 1px ${p.border}, 0 4px 14px rgba(0,0,0,.25);
}
/* icon wallpaper, faint, behind everything */
${sel}::before {
  content: ""; position: fixed; inset: 0; z-index: 2147482999; pointer-events: none;
  background: url("${wallUri}") repeat; opacity: .045;
}
${sel} ::selection { background: ${p.accent}55; }
${sel} * { scrollbar-color: ${p.border} transparent; }
`
}

/** Claude Code custom theme file (~/.claude/themes/<slug>.json, /theme picker). */
export function toClaudeCodeTheme(theme) {
  const p = theme.palette
  const dark = theme.mode === 'dark'
  return {
    name: `${theme.name} (skinshift)`,
    base: dark ? 'dark' : 'light',
    overrides: {
      claude: p.accent,
      text: p.text,
      inactive: p.textMuted,
      subtle: p.border,
      suggestion: p.accent2,
      remember: p.accent2,
      permission: p.accent2,
      planMode: p.accent2,
      autoAccept: p.positive,
      bashBorder: p.negative,
      promptBorder: p.accent,
      success: p.positive,
      error: p.negative,
      warning: mix(p.accent2, p.negative, 0.3),
      merged: p.accent2,
      ide: p.accent2,
      diffAdded: mix(p.positive, p.bg, dark ? 0.7 : 0.75),
      diffRemoved: mix(p.negative, p.bg, dark ? 0.7 : 0.75),
      diffAddedDimmed: mix(p.positive, p.bg, 0.85),
      diffRemovedDimmed: mix(p.negative, p.bg, 0.85),
      diffAddedWord: mix(p.positive, p.bg, 0.45),
      diffRemovedWord: mix(p.negative, p.bg, 0.45),
    },
  }
}

/**
 * One row of the theme's line style in terminal characters, as colored runs:
 * [{ text, color }]. Candles alternate the domain's good/bad colors.
 */
export function terminalLine(theme, width) {
  const chars = TERMINAL_LINES[theme.pattern] || TERMINAL_LINES.dashes
  const p = theme.palette
  const runs = []
  let seed = 11
  for (let i = 0; i < Math.max(0, width); i++) {
    const ch = chars[i % chars.length]
    let color = i % 2 ? p.accent : p.accent2
    if (theme.pattern === 'candles') {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      color = seed % 3 ? p.positive : p.negative
    } else if (theme.pattern === 'filmstrip' || theme.pattern === 'circuit' || theme.pattern === 'wave' || theme.pattern === 'dashes') {
      color = p.accent
    }
    const last = runs[runs.length - 1]
    if (last && last.color === color) last.text += ch
    else runs.push({ text: ch, color })
  }
  return runs
}
