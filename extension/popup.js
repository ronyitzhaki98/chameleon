import { iconSvg, logoSvg, renderPattern, svgDataUri } from './core/index.js'

const $ = id => document.getElementById(id)
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
let state = null
let reachable = true
try {
  state = await chrome.tabs.sendMessage(tab.id, { type: 'state' })
} catch {
  reachable = false
}

function show(theme) {
  if (!theme) return
  $('title').textContent = theme.name
  $('logo').innerHTML = logoSvg(theme, 30)
  $('swatches').innerHTML = Object.values(theme.palette).map(c => `<span style="background:${c}"></span>`).join('')
  $('strip').style.backgroundImage = `url("${svgDataUri(renderPattern(theme.pattern, theme.palette).svg)}")`
  $('icons').innerHTML = theme.icons.map(name => iconSvg(name, { color: theme.palette.accent, size: 22 })).join('')
}

const onClaude = /^https:\/\/claude\.ai\//.test(tab?.url || '')

if (!state) {
  $('design').disabled = $('off').disabled = true
  if (onClaude && !reachable) $('status').textContent = 'Refresh this claude.ai tab once so Chameleon can load into it.'
  else if (onClaude) $('status').textContent = 'Open a chat inside a project (or a project page).'
} else {
  const where = state.info.kind === 'project' ? 'Project' : 'Chat'
  const source = state.theme?.source === 'claude' ? 'designed by Claude' : 'starter theme'
  $('status').textContent = state.theme
    ? `${where}: ${state.info.name || 'untitled'} · ${source}`
    : `${state.info.name || 'This project'} has no theme yet.`
  show(state.theme)
}

$('design').onclick = async () => {
  const info = { ...state.info, idea: [state.info.idea, $('idea').value.trim()].filter(Boolean).join('\n\nThe look I want: ') }
  const { text } = await chrome.runtime.sendMessage({ type: 'designPrompt', info })
  const { ok } = await chrome.tabs.sendMessage(tab.id, { type: 'compose', text })
  $('status').textContent = ok
    ? 'Added to your chat. Press send; the theme switches when Claude replies.'
    : 'Open a chat in this project first, then try again.'
}

$('off').onclick = async () => {
  await chrome.runtime.sendMessage({ type: 'off', key: state.info.key })
  await chrome.tabs.sendMessage(tab.id, { type: 'apply', info: state.info, css: null, theme: null })
  $('status').textContent = 'Theme off for this project.'
}

$('diag').onclick = async () => {
  let report
  try {
    report = await chrome.tabs.sendMessage(tab.id, { type: 'diagnose' })
  } catch (e) {
    report = { error: `content script not reachable: ${e.message}`, url: (tab?.url || '').replace(/[0-9a-f-]{36}/g, '<id>') }
  }
  const text = JSON.stringify(report, null, 1)
  $('diagOut').hidden = false
  $('diagOut').value = text
  try {
    await navigator.clipboard.writeText(text)
    $('status').textContent = 'Diagnostics copied. Paste them in the Chameleon thread.'
  } catch {
    $('diagOut').select()
    $('status').textContent = 'Copy the text below and paste it in the Chameleon thread.'
  }
}
