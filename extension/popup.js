import { renderPattern, svgDataUri } from './core/index.js'

const $ = id => document.getElementById(id)
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
let state = null
try {
  state = await chrome.tabs.sendMessage(tab.id, { type: 'state' })
} catch {}

function show(theme) {
  if (!theme) return
  $('title').textContent = theme.name
  $('logo').innerHTML = theme.logo.replace(/currentColor/g, theme.palette.accent)
  $('swatches').innerHTML = Object.values(theme.palette).map(c => `<span style="background:${c}"></span>`).join('')
  $('strip').style.backgroundImage = `url("${svgDataUri(renderPattern(theme.pattern, theme.palette).svg)}")`
  $('glyphs').textContent = theme.glyphs.join(' ')
}

if (!state) {
  $('design').disabled = $('off').disabled = true
} else {
  $('status').textContent = state.theme
    ? `${state.info.kind === 'project' ? 'Project' : 'Chat'}: ${state.info.name || 'untitled'} · ${state.theme.motif} motif`
    : `${state.info.name || 'This project'} has no theme yet.`
  show(state.theme)
}

$('design').onclick = async () => {
  $('design').disabled = true
  $('status').textContent = 'Designing…'
  const info = { ...state.info, idea: $('idea').value.trim() || state.info.idea }
  const res = await chrome.runtime.sendMessage({ type: 'design', info })
  if (res.error && !res.theme) {
    $('status').textContent = res.error
  } else {
    await chrome.tabs.sendMessage(tab.id, { type: 'apply', info: state.info, css: res.css, theme: res.theme })
    $('status').textContent = res.source === 'model' ? 'Designed by Claude.' : `Offline motif${res.error ? ` (${res.error})` : ' (add an API key in Settings for designed themes)'}.`
    show(res.theme)
  }
  $('design').disabled = false
}

$('off').onclick = async () => {
  await chrome.runtime.sendMessage({ type: 'off', key: state.info.key })
  await chrome.tabs.sendMessage(tab.id, { type: 'apply', info: state.info, css: null, theme: null })
  $('status').textContent = 'Theme off for this project.'
}
