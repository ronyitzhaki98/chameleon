import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  chatDesignPrompt, contrast, extractDesignBlock, extractJson, generateTheme, iconSvg, logoSvg, matchMotif, normalizeTheme,
  PATTERN_IDS, renderPattern, resolveIcon, searchIcons, terminalLine, toClaudeAiCss, toClaudeCodeTheme,
} from '../core/index.js'

test('keyword fallback maps the two examples from the brief', () => {
  assert.equal(matchMotif('I want to build a software for video editing'), 'film')
  assert.equal(matchMotif('a day trading app with live charts'), 'finance')
  assert.equal(matchMotif('a todo list'), 'default')
})

test('a model reply wrapped in prose and fences is parsed', async () => {
  const reply = 'Sure!\n```json\n{"name":"Bull Run","motif":"finance","pattern":"candles","palette":{"bg":"#000000","text":"#111111"},"glyphs":["📈"]}\n```'
  const { theme, source } = await generateTheme({ idea: 'trading', complete: async () => reply })
  assert.equal(source, 'model')
  assert.equal(theme.name, 'Bull Run')
  assert.equal(theme.pattern, 'candles')
  assert.ok(contrast(theme.palette.text, theme.palette.bg) >= 7, 'unreadable text is repaired')
})

test('a failing model call still yields a full theme', async () => {
  const r = await generateTheme({ idea: 'video editing app', complete: async () => { throw new Error('offline') } })
  assert.equal(r.source, 'fallback')
  assert.equal(r.theme.motif, 'film')
  assert.match(r.error, /offline/)
})

test('extractJson ignores braces inside strings', () => {
  assert.deepEqual(extractJson('x {"a":"}{","b":{"c":1}} y'), { a: '}{', b: { c: 1 } })
  assert.equal(extractJson('no json'), null)
})

test('icons resolve to real Tabler icons, by name or description', () => {
  assert.equal(resolveIcon('movie'), 'movie')
  assert.equal(resolveIcon('candlestick chart'), 'chart-candle')
  assert.equal(resolveIcon('brand-youtube'), null)
  assert.ok(searchIcons('rocket').includes('rocket'))
  const theme = normalizeTheme({ motif: 'film', icons: ['film camera', 'not-a-real-icon-xyz', 'movie'] }, { resolveIcon })
  assert.ok(theme.icons.includes('camera') && theme.icons.includes('movie'))
  assert.ok(!theme.icons.includes('not-a-real-icon-xyz'))
  assert.match(iconSvg('movie', { color: '#ff0000' }), /stroke="#ff0000"/)
})

test('the logo badge is a clean SVG in the theme colors', () => {
  const theme = normalizeTheme({ motif: 'finance' }, { resolveIcon })
  const svg = logoSvg(theme)
  assert.match(svg, /^<svg[\s\S]*<\/svg>$/)
  assert.ok(!/<script|on\w+=|href=/i.test(svg))
  assert.match(svg, new RegExp(theme.palette.accent))
})

test('a design block in a chat reply is picked up', () => {
  const reply = 'Golden-hour film set.\n```chameleon\n{"name":"Golden Hour","icons":["movie"]}\n```'
  assert.deepEqual(extractDesignBlock(reply), { name: 'Golden Hour', icons: ['movie'] })
  assert.equal(extractDesignBlock('```json\n{"a":1}\n```'), null)
  assert.match(chatDesignPrompt({ idea: 'video editing', projectName: 'Video editor app' }), /```chameleon/)
})

test('every pattern renders an SVG', () => {
  const { palette } = normalizeTheme({})
  for (const id of PATTERN_IDS) assert.match(renderPattern(id, palette).svg, /^<svg[\s\S]*<\/svg>$/)
})

test('claude.ai CSS is scoped and sets the color tokens as HSL triplets', () => {
  const css = toClaudeAiCss(normalizeTheme({ motif: 'finance' }))
  assert.match(css, /html\[data-chameleon\]/)
  assert.match(css, /--bg-100: [\d.]+ [\d.]+% [\d.]+% !important/)
  for (const [, uri] of css.matchAll(/url\("data:image\/svg\+xml;charset=utf-8,([^"]+)"\)/g)) {
    assert.ok(!/<script|on\w+=/i.test(decodeURIComponent(uri)))
  }
})

test('Claude Code theme has the custom-theme shape', () => {
  const cc = toClaudeCodeTheme(normalizeTheme({ motif: 'nature' }))
  assert.equal(cc.base, 'light')
  assert.ok(cc.overrides.claude.startsWith('#'))
})

test('terminal line fills the width', () => {
  const runs = terminalLine(normalizeTheme({ motif: 'finance' }), 40)
  assert.equal(runs.map(r => r.text).join('').length, 40)
})

test('live tokens are retinted in the format the page wrote them', async () => {
  const { parseColor, formatColor, retintTokens } = await import('../core/retint.js')
  for (const v of ['#1f1e1d', '30 3.3% 11.8%', 'rgb(31 30 29)']) {
    const c = parseColor(v)
    assert.ok(c, v)
    assert.equal(parseColor(formatColor(c.rgb, c)).format, c.format)
  }
  assert.equal(parseColor('12px'), null)
  const theme = normalizeTheme({ motif: 'finance', mode: 'dark' }, { resolveIcon })
  const page = {
    '--cds-surface-0': '#262624', '--cds-text-primary': '#faf9f5', '--cds-fill-accent': '#d97757',
    '--bg-100': '60 2.1% 18.4%', '--text-100': '48 33.3% 97.1%', '--accent-brand': '15 63.1% 59.6%',
    '--danger-100': '0 67% 59.6%', '--chart-purple': '#8b5cf6', '--radius': '8px',
  }
  const out = retintTokens(page, theme)
  assert.match(out['--cds-surface-0'], /^#[0-9a-f]{6}$/)
  assert.match(out['--bg-100'], /^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/)
  assert.ok(out['--cds-fill-accent'] && out['--accent-brand'], 'accent follows the theme')
  assert.ok(!('--chart-purple' in out) && !('--radius' in out), 'unrelated tokens are left alone')
  const css = toClaudeAiCss(theme, { root: page, scopes: { '.dframe-root': { '--df-sidebar-bg': '#1f1e1d' } } })
  assert.match(css, /html\[data-chameleon\] \.dframe-root \{[^}]*--df-sidebar-bg/)
})

test('two ideas with the same motif get different starter palettes', async () => {
  const { fallbackTheme } = await import('../core/generate.js')
  const a = fallbackTheme({ idea: 'a day trading app with candlestick charts', projectName: 'Bull desk', resolveIcon })
  const b = fallbackTheme({ idea: 'a crypto portfolio tracker for traders', projectName: 'Coin watch', resolveIcon })
  assert.equal(a.motif, b.motif)
  assert.notEqual(a.palette.accent, b.palette.accent)
  const again = fallbackTheme({ idea: 'a day trading app with candlestick charts', projectName: 'Bull desk', resolveIcon })
  assert.equal(again.palette.accent, a.palette.accent, 'stable for the same project')
})
