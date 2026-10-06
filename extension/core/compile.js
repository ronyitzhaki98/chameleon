// Compilers for Claude Code: the custom theme file and the terminal line.
// (The claude.ai stylesheet is in compile-web.js, with the icon pack.)

import { hslTriplet, mix } from './color.js'
import { TERMINAL_LINES } from './patterns.js'

/** Claude Code custom theme file (~/.claude/themes/<slug>.json, /theme picker). */
export function toClaudeCodeTheme(theme) {
  const p = theme.palette
  const dark = theme.mode === 'dark'
  return {
    name: `${theme.name} (chameleon)`,
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
