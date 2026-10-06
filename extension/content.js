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
  let watchUntil = 0

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
    const path = location.pathname
    if (!force && path === lastPath) return
    lastPath = path
    const mine = ++seq
    let info = null
    try {
      info = await globalThis.ChameleonDetect(location, fetch.bind(globalThis))
    } catch (e) {
      console.debug('[chameleon] detect failed', e)
    }
    if (mine !== seq) return
    const sameDesign = (info?.design?.id || null) === (current?.info?.design?.id || null)
    if (info && current?.theme && current.info.key === info.key && sameDesign && !force) return
    const res = await chrome.runtime.sendMessage({ type: 'resolve', info })
    if (mine !== seq) return
    current = res && res.css ? { info, theme: res.theme } : info ? { info, theme: null } : null
    apply(res && res.css, res && res.theme)
    // A brand-new project has no first prompt yet: look again shortly.
    if (res && res.pending) setTimeout(() => { lastPath = null }, 4000)
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

  setInterval(() => refresh(false), 400)
  setInterval(() => { if (Date.now() < watchUntil && location.pathname.startsWith('/chat/')) refresh(true) }, 3000)
  refresh(false)
})()
