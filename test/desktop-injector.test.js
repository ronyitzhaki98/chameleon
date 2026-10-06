import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as core from '../core/index.js'

process.env.HOME = mkdtempSync(join(tmpdir(), 'chameleon-home-'))
const require = createRequire(import.meta.url)
const { createInjector } = require('../desktop/injector.cjs')

class FakeWebContents extends EventEmitter {
  constructor() { super(); this.url = 'https://claude.ai/new'; this.css = new Map(); this.n = 0; this.attr = null }
  getURL() { return this.url }
  async insertCSS(css) { const k = `k${++this.n}`; this.css.set(k, css); return k }
  async removeInsertedCSS(k) { this.css.delete(k) }
  async executeJavaScript(src) {
    if (src.includes('setAttribute')) this.attr = JSON.parse(src.match(/, (".*")\)$/)[1])
    else if (src.includes('removeAttribute')) this.attr = null
  }
}

test('applies a project theme and swaps it on navigation', async () => {
  const infos = {
    '/chat/a': { kind: 'project', key: 'project:test-film', name: 'Video editor app', idea: 'video editing software' },
    '/chat/b': { kind: 'project', key: 'project:test-trade', name: 'Day trading app', idea: 'day trading app' },
  }
  const inj = createInjector({ core, config: () => ({}), detect: async wc => infos[new URL(wc.getURL()).pathname] || null })
  const wc = new FakeWebContents()
  const apply = inj.attach(wc)
  wc.url = 'https://claude.ai/chat/a'
  await apply()
  assert.equal(wc.attr, 'video-editor-app')
  assert.equal(wc.css.size, 1)
  wc.url = 'https://claude.ai/chat/b'
  await apply()
  assert.equal(wc.attr, 'day-trading-app')
  assert.equal(wc.css.size, 1, 'the old sheet was removed')
  wc.url = 'https://claude.ai/new'
  await apply()
  assert.equal(wc.attr, null)
  assert.equal(wc.css.size, 0)
})
