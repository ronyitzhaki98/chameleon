// A minimal Messages API transport for targets that hold their own API key
// (the browser extension, the CLI). The Claude Code plugin does not need it:
// it uses the session's own client through $.model.complete.

export const DEFAULT_MODEL = 'claude-sonnet-5-5'

export function anthropicComplete({ apiKey, model = DEFAULT_MODEL, fetchImpl = globalThis.fetch, browser = false }) {
  return async (system, prompt) => {
    const headers = {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }
    // Required by the API for calls made from a browser context (an extension's
    // service worker counts); the key never leaves the user's own browser.
    if (browser) headers['anthropic-dangerous-direct-browser-access'] = 'true'
    const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, max_tokens: 2000, system, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = await res.json()
    return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
  }
}
