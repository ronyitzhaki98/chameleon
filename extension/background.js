// Service worker: owns the theme store. Free by design: no API keys. New
// projects get an instant theme from the built-in motifs and icon pack; a
// custom design comes from Claude in the person's own chat (see content.js).
import {
  chatDesignPrompt, extractDesignBlock, generateTheme, normalizeTheme, resolveIcon, toClaudeAiCss,
} from './core/index.js'

const settings = () => chrome.storage.local.get({ auto: true, themeChats: false })

async function getTheme(key) {
  const k = `theme:${key}`
  return (await chrome.storage.local.get(k))[k] || null
}

async function save(info, theme, extra = {}) {
  const stored = { ...theme, key: info.key, projectName: info.name, ...extra }
  await chrome.storage.local.set({ [`theme:${info.key}`]: stored })
  await chrome.storage.local.remove(`off:${info.key}`)
  return stored
}

const load = theme => normalizeTheme(theme, { resolveIcon })
const answer = theme => ({ css: toClaudeAiCss(theme), theme })

async function resolve(info) {
  if (!info) return { css: null }
  const s = await settings()
  if (info.kind === 'chat' && !s.themeChats && !info.design) return { css: null }
  let stored = await getTheme(info.key)

  // Claude designed a theme in this chat that we have not applied yet.
  if (info.design && stored?.designId !== info.design.id) {
    const json = extractDesignBlock(info.design.text)
    if (json) {
      const theme = normalizeTheme({ ...json, idea: info.idea }, { idea: info.idea, resolveIcon })
      return answer(load(await save(info, theme, { source: 'claude', designId: info.design.id })))
    }
  }

  if ((await chrome.storage.local.get(`off:${info.key}`))[`off:${info.key}`]) return { css: null }
  if (!stored) {
    if (!s.auto || !info.idea) return { css: null, pending: !info.idea }
    const { theme } = await generateTheme({ idea: info.idea, projectName: info.name, resolveIcon })
    stored = await save(info, theme, { source: 'motif' })
  }
  return answer(load(stored))
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  const run = async () => {
    switch (msg.type) {
      case 'resolve':
        return resolve(msg.info)
      case 'designPrompt':
        return { text: chatDesignPrompt({ idea: msg.info.idea, projectName: msg.info.name }) }
      case 'off':
        await chrome.storage.local.remove(`theme:${msg.key}`)
        await chrome.storage.local.set({ [`off:${msg.key}`]: true })
        return { ok: true }
      case 'list': {
        const all = await chrome.storage.local.get(null)
        return Object.entries(all).filter(([k]) => k.startsWith('theme:')).map(([, v]) => v)
      }
      default:
        return { error: `unknown message ${msg.type}` }
    }
  }
  run().then(reply, e => reply({ error: String(e?.message || e) }))
  return true
})
