// Content script: notices which project is open, asks the service worker for
// its theme, and applies it. Navigation inside claude.ai is client-side, so the
// URL is watched rather than page loads.
//
// "Design with Claude" (popup): puts a design request in the chat composer. The
// person presses send; when Claude's reply with a ```chameleon block appears,
// the detector sees it and the theme switches. No API key, no extra cost.
(() => {
  const STYLE_ID = 'chameleon-style'
  let lastPath = null
  let current = null // { info, theme }
  let seq = 0
  let shape = ''
  let watchUntil = 0
  let lastError = null
  let lastResolve = null

  // Elements claude.ai declares its own color tokens on (besides <html>).
  const SCOPES = ['.dframe-root', '.dframe-sidebar', '.dframe-card', '.dframe-sidebar-body']

  function readTokens(el) {
    const cs = getComputedStyle(el)
    const out = {}
    for (let i = 0; i < cs.length; i++) {
      const name = cs[i]
      if (!name.startsWith('--')) continue
      const value = cs.getPropertyValue(name).trim()
      if (value && value.length < 80) out[name] = value
    }
    return out
  }

  /** The page's own tokens, read with our sheet switched off for a moment. */
  function readPage() {
    const style = document.getElementById(STYLE_ID)
    if (style) style.disabled = true
    try {
      const root = readTokens(document.documentElement)
      const scopes = {}
      for (const sel of SCOPES) {
        const el = document.querySelector(sel)
        if (!el) continue
        const own = {}
        for (const [k, v] of Object.entries(readTokens(el))) if (root[k] !== v) own[k] = v
        if (Object.keys(own).length) scopes[sel] = own
      }
      return { root, scopes }
    } finally {
      if (style) style.disabled = false
    }
  }

  const pageShape = () => SCOPES.filter(sel => document.querySelector(sel)).join(',') + '|' +
    (document.documentElement.getAttribute('data-mode') || '') + '|' + document.documentElement.className

  function apply(css, theme) {
    let style = document.getElementById(STYLE_ID)
    if (!css) {
      style?.remove()
      document.documentElement.removeAttribute('data-chameleon')
      return
    }
    if (!style) {
      style = document.createElement('style')
      style.id = STYLE_ID
    }
    style.textContent = css
    // Keep it last so it wins ties with the app's own sheets.
    ;(document.head || document.documentElement).appendChild(style)
    document.documentElement.setAttribute('data-chameleon', theme.id)
  }

  async function refresh(force = false) {
    const onCode = /^\/code\/session_/.test(location.pathname)
    const path = location.pathname + (onCode ? `|${codeSignature()}` : '')
    if (!force && path === lastPath) return
    lastPath = path
    const mine = ++seq
    let info = null
    try {
      info = await globalThis.ChameleonDetect(location, fetch.bind(globalThis))
      lastError = null
    } catch (e) {
      lastError = String(e?.message || e)
      console.warn('[chameleon] project lookup failed, reading the page instead:', lastError)
      info = detectFromPage()
    }
    if (!info && onCode) info = detectCodeSession()
    if (mine !== seq) return
    const sameDesign = (info?.design?.id || null) === (current?.info?.design?.id || null)
    if (info && current?.theme && current.info.key === info.key && sameDesign && !force) return
    const page = readPage()
    shape = pageShape()
    const res = await chrome.runtime.sendMessage({ type: 'resolve', info, page })
    lastResolve = res ? { hasCss: Boolean(res.css), pending: Boolean(res.pending), error: res.error || null, retinted: res.retinted ?? null } : null
    if (mine !== seq) return
    current = res && res.css ? { info, theme: res.theme } : info ? { info, theme: null } : null
    apply(res && res.css, res && res.theme)
    // A brand-new project has no first prompt yet: look again shortly.
    if (res && res.pending) setTimeout(() => { lastPath = null }, 4000)
  }

  // Fallback when claude.ai's own data endpoints fail: the project link the
  // page shows above a chat (or the project page itself).
  function detectFromPage() {
    const onProject = location.pathname.match(/^\/project\/([0-9a-f-]{36})/)
    const link = document.querySelector('header a[href^="/project/"], main a[href^="/project/"], [data-testid*="breadcrumb"] a[href^="/project/"]')
    const id = onProject ? onProject[1] : link?.getAttribute('href').match(/^\/project\/([0-9a-f-]{36})/)?.[1]
    if (!id) return null
    const name = (onProject ? document.querySelector('main h1, h1')?.textContent : link.textContent)?.trim() || ''
    return { kind: 'project', key: `project:${id}`, name, idea: name, design: null, viaPage: true }
  }

  // Claude Code on the web (claude.ai/code/session_…): there is no project,
  // so each session is its own, with its title (Claude names it after the
  // first prompt) as the idea and its repository as extra context. Sessions
  // in one repo still differ, because each one is usually a different idea.
  function sessionTitle() {
    const clean = t => String(t || '').replace(/\s*[|·–—-]\s*Claude(\s+Code)?\s*$/i, '').replace(/\s+/g, ' ').trim()
    const generic = t => /^(claude(\s+code)?|code|new session|untitled|loading…?)?$/i.test(t)
    const fromTab = clean(document.title)
    if (!generic(fromTab)) return fromTab
    // The tab may keep a generic title; the sidebar entry for the open session
    // (or the session header) carries its name. Take its first line of text,
    // which skips the repo name and time shown under it.
    const id = location.pathname.match(/^\/code\/(session_[\w-]+)/)?.[1]
    const places = [id && document.querySelector(`a[href$="/code/${id}"], a[href*="/code/${id}?"]`), document.querySelector('main h1, header h1, [data-testid*="session-title"], [data-testid*="title"]')]
    for (const el of places) {
      if (!el) continue
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = clean(n.textContent)
        if (text.length > 2 && !generic(text) && !REPO.test(text)) return text
      }
    }
    return ''
  }

  const REPO = /^([A-Za-z0-9][\w.-]*)\/([A-Za-z][\w.-]*)$/
  // Only the open session's own header and body: the sidebar lists every
  // session with its repo, and reading it would give all of them the first one.
  const OTHER = 'nav, aside, [role="navigation"], [role="complementary"], a[href^="/code/"], pre, code, [contenteditable="true"]'
  function findRepo() {
    const scope = document.querySelector('main') || document.body
    if (!scope) return null
    const link = [...scope.querySelectorAll('a[href*="github.com/"]')]
      .filter(a => !a.closest(OTHER))
      .map(a => a.getAttribute('href').match(/github\.com\/([\w.-]+)\/([\w.-]+)/))
      .find(m => m && !['apps', 'settings', 'orgs', 'login'].includes(m[1]))
    if (link) return { repo: `${link[1]}/${link[2].replace(/\.git$/, '')}`, via: 'link' }
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(), i = 0; n && i < 6000; n = walker.nextNode(), i++) {
      const text = n.textContent.trim()
      if (text.length < 80 && REPO.test(text) && !n.parentElement.closest(OTHER)) return { repo: text, via: 'text' }
    }
    return null
  }

  // The latest ```chameleon block Claude wrote in the session, as rendered.
  function codeDesign() {
    const blocks = [...document.querySelectorAll('pre')].map(p => p.textContent.trim()).filter(t => t.startsWith('{') && t.includes('"palette"'))
    const text = blocks.pop()
    if (!text) return null
    let h = 0
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
    return { id: `dom-${(h >>> 0).toString(36)}`, text: '```chameleon\n' + text + '\n```' }
  }

  function codeSignature() {
    const repo = findRepo()
    return `${sessionTitle()}|${repo?.repo || ''}|${codeDesign()?.id || ''}`
  }

  function detectCodeSession() {
    const session = location.pathname.match(/^\/code\/(session_[\w-]+)/)?.[1]
    if (!session) return null
    const title = sessionTitle()
    const found = findRepo()
    const repoName = found?.repo.split('/')[1] || ''
    // With no name found yet, still theme it (the signature includes the title,
    // so it is redone when a name shows up); the session id keeps unnamed
    // sessions from all looking the same.
    return {
      kind: 'code',
      key: `code:${session}`,
      name: title || repoName || 'Code session',
      idea: title ? (repoName ? `${title} (repo: ${repoName})` : title) : repoName || `Claude Code session ${session.slice(-6)}`,
      design: codeDesign(),
      viaPage: true,
      repoVia: found?.via || null,
    }
  }

  function diagnose() {
    const html = document.documentElement
    const page = readPage()
    const colorish = Object.entries(page.root).filter(([, v]) => /^#|^\d+(\.\d+)?(deg)?\s+[\d.]+%|^(rgb|hsl|oklch)/i.test(v))
    return {
      extension: chrome.runtime.getManifest().version,
      path: location.pathname.replace(/[0-9a-f-]{36}/g, '<id>').replace(/session_\w+/, 'session_<id>'),
      html: { class: html.className, mode: html.getAttribute('data-mode'), theme: html.getAttribute('data-theme'), applied: html.getAttribute('data-chameleon') },
      styleTag: Boolean(document.getElementById(STYLE_ID)),
      detect: current?.info
        ? { kind: current.info.kind, via: current.info.viaPage ? 'page' : 'api', nameChars: (current.info.name || '').length, ideaChars: (current.info.idea || '').length, hasDesign: Boolean(current.info.design), repoVia: current.info.repoVia ?? undefined }
        : null,
      lookupError: lastError,
      resolve: lastResolve,
      tokens: {
        root: Object.keys(page.root).length,
        colors: colorish.length,
        sample: colorish.filter(([k]) => /surface|bg-|text-|accent|brand|gray-5/.test(k)).slice(0, 24),
        scopes: Object.fromEntries(Object.entries(page.scopes).map(([k, v]) => [k, Object.keys(v).length])),
      },
      code: /^\/code\//.test(location.pathname) ? { titleChars: sessionTitle().length, tabTitleGeneric: /^(claude(\s+code)?)?$/i.test(document.title.trim()), sessionLink: Boolean(document.querySelector(`a[href*="${location.pathname}"]`)), repoFound: findRepo()?.via || null, githubLinks: document.querySelectorAll('a[href*="github.com/"]').length } : undefined,
      composer: Boolean(document.querySelector('div[contenteditable="true"], textarea')),
    }
  }

  function compose(text) {
    const box = document.querySelector('div[contenteditable="true"], textarea')
    if (!box) return false
    box.focus()
    if (box.tagName === 'TEXTAREA') {
      box.value = text
      box.dispatchEvent(new Event('input', { bubbles: true }))
    } else {
      document.execCommand('selectAll', false)
      document.execCommand('insertText', false, text)
    }
    return true
  }

  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg.type === 'state') {
      reply(current)
    } else if (msg.type === 'diagnose') {
      reply(diagnose())
    } else if (msg.type === 'compose') {
      const ok = compose(msg.text)
      // Watch for Claude's reply for a few minutes after the request is sent.
      if (ok) watchUntil = Date.now() + 5 * 60 * 1000
      reply({ ok })
    } else if (msg.type === 'apply') {
      current = { info: msg.info, theme: msg.theme }
      apply(msg.css, msg.theme)
      reply({ ok: true })
    } else if (msg.type === 'refresh') {
      refresh(true).then(() => reply({ ok: true }))
      return true
    }
  })

  // Guard: re-attach the style if the app re-renders <head>.
  new MutationObserver(() => {
    if (current?.theme && !document.getElementById(STYLE_ID)) refresh(true)
  }).observe(document.documentElement, { childList: true, subtree: false })

  // Re-read the page when it changes shape: its sheets finish loading, the
  // frame elements appear, or light/dark mode flips.
  setInterval(() => {
    if (current?.theme && pageShape() !== shape) refresh(true)
    else refresh(false)
  }, 400)
  window.addEventListener('load', () => current?.theme && refresh(true))
  setInterval(() => { if (Date.now() < watchUntil && location.pathname.startsWith('/chat/')) refresh(true) }, 3000)
  refresh(false)
})()
