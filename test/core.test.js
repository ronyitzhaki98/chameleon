import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  contrast, extractJson, generateTheme, matchMotif, normalizeTheme, PATTERN_IDS, renderPattern,
  sanitizeSvg, terminalLine, toClaudeAiCss, toClaudeCodeTheme,
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

test('logos are sanitized', () => {
  assert.equal(sanitizeSvg('<svg><script>alert(1)</script></svg>'), null)
  assert.equal(sanitizeSvg('<svg><foreignObject><div/></foreignObject></svg>'), null)
  const clean = sanitizeSvg('<svg viewBox="0 0 32 32"><rect onload="x()" fill="url(https://evil)" width="3" href="javascript:1"/></svg>')
  assert.equal(clean, '<svg viewBox="0 0 32 32"><rect width="3"/></svg>')
  const theme = normalizeTheme({ logo: '<svg><image href="https://x"/></svg>', motif: 'film' })
  assert.ok(!theme.logo.includes('image'), 'an unsafe logo falls back to the motif logo')
})

test('every pattern renders an SVG', () => {
  const { palette } = normalizeTheme({})
  for (const id of PATTERN_IDS) assert.match(renderPattern(id, palette).svg, /^<svg[\s\S]*<\/svg>$/)
})

test('claude.ai CSS is scoped and sets the color tokens as HSL triplets', () => {
  const css = toClaudeAiCss(normalizeTheme({ motif: 'finance' }))
  assert.match(css, /html\[data-skinshift\]/)
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
