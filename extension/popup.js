import { iconSvg, logoSvg, renderPattern, svgDataUri } from './core/index.js'

const $ = id => document.getElementById(id)
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
let state = null
try {
  state = await chrome.tabs.sendMessage(tab.id, { type: 'state' })
} catch {}

function show(theme) {
  if (!theme) return
  $('title').textContent = theme.name
  $('logo').innerHTML = logoSvg(theme, 30)
  $('swatches').innerHTML = Object.values(theme.palette).map(c => `<span style="background:${c}"></span>`).join('')
  $('strip').style.backgroundImage = `url("${svgDataUri(renderPattern(theme.pattern, theme.palette).svg)}")`
  $('icons').innerHTML = theme.icons.map(name => iconSvg(name, { color: theme.palette.accent, size: 22 })).join('')
}

if (!state) {
  $('design').disabled = $('off').disabled = true
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
