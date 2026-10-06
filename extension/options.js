const ids = ['auto', 'themeChats']
chrome.storage.local.get({ auto: true, themeChats: false }).then(s => {
  for (const id of ids) {
    const el = document.getElementById(id)
    if (el.type === 'checkbox') el.checked = s[id]
    else el.value = s[id]
  }
})
document.getElementById('save').onclick = async () => {
  const next = {}
  for (const id of ids) {
    const el = document.getElementById(id)
    next[id] = el.type === 'checkbox' ? el.checked : el.value.trim()
  }
  await chrome.storage.local.set(next)
  document.getElementById('saved').textContent = 'Saved.'
}
