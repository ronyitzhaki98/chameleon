// End-to-end: loads the real extension into Chromium, serves a claude.ai test
// double at https://claude.ai (same URLs, same token names, a mocked JSON API),
// and checks that each project gets its own theme and that it switches as you
// move between chats. Screenshots land in docs/screenshots/.
import { mkdirSync, readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const shots = join(root, 'docs/screenshots')
mkdirSync(shots, { recursive: true })
const page404 = { status: 404, body: '{}' }
const DESIGN_REPLY = 'A warm, golden-hour film set: tungsten amber on deep charcoal, film-strip dividers.\n\n```chameleon\n' + JSON.stringify({
  name: 'Golden Hour', motif: 'film', mode: 'dark',
  palette: { bg: '#15120e', surface: '#1d1914', surfaceAlt: '#27211a', text: '#f4ead8', textMuted: '#a8997f', accent: '#f2a541', accent2: '#e05d44', positive: '#7cb36b', negative: '#e05d44', border: '#3a3126' },
  pattern: 'filmstrip', icons: ['movie', 'camera', 'bulb', 'microphone-2', 'video', 'aperture'], logoIcon: 'movie', glyphs: ['🎬', '🎥', '💡', '🎙️', '🎞️'],
}) + '\n```'
let replyArrived = false
let apiDown = false
const ORG = '99999999-9999-4999-8999-999999999999'
const projects = {
  '11111111-1111-4111-8111-111111111111': { name: 'Video editor app', first: 'I want to build a software for video editing' },
  '22222222-2222-4222-8222-222222222222': { name: 'Day trading app', first: 'I want to build a day trading app with live candlestick charts' },
}
const chats = {
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa': { project: '11111111-1111-4111-8111-111111111111', text: 'How should the timeline handle scrubbing at 60fps?' },
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb': { project: '22222222-2222-4222-8222-222222222222', text: 'Stream the order book over a websocket.' },
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc': { project: null, text: 'What is the capital of Peru?' },
  // a chat where Claude answered "Design with Claude" (its reply arrives after the request is sent)
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd': { project: '11111111-1111-4111-8111-111111111111', text: 'Design a Chameleon theme for this project', reply: DESIGN_REPLY },
  // each project's oldest chat holds its first prompt
  'f1111111-1111-4111-8111-111111111111': { project: '11111111-1111-4111-8111-111111111111', text: projects['11111111-1111-4111-8111-111111111111'].first },
  'f2222222-2222-4222-8222-222222222222': { project: '22222222-2222-4222-8222-222222222222', text: projects['22222222-2222-4222-8222-222222222222'].first },
}

function api(path) {
  let m
  if (path === '/api/organizations') return [{ uuid: ORG }]
  if ((m = path.match(/chat_conversations\/([0-9a-f-]{36})/))) {
    const c = chats[m[1]]
    const messages = [{ uuid: `${m[1]}-1`, sender: 'human', text: c.text }]
    if (c.reply && replyArrived) messages.push({ uuid: `${m[1]}-2`, sender: 'assistant', text: c.reply })
    return c && { uuid: m[1], name: '', project_uuid: c.project, chat_messages: messages }
  }
  if ((m = path.match(/projects\/([0-9a-f-]{36})\/conversations$/))) {
    return Object.entries(chats).filter(([, c]) => c.project === m[1]).map(([uuid]) => ({ uuid, created_at: uuid.startsWith('f') ? '2026-01-01' : '2026-05-01' }))
  }
  if ((m = path.match(/projects\/([0-9a-f-]{36})$/))) return projects[m[1]] && { uuid: m[1], name: projects[m[1]].name, description: '' }
  return null
}

const ext = join(root, 'extension')
const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'chameleon-e2e-')), {
  // the full Chromium build: the headless shell cannot load extensions
  channel: 'chromium',
  headless: true,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  viewport: { width: 1180, height: 720 },
})
const html = readFileSync(join(root, 'test/e2e/fake-claude.html'), 'utf8')
await context.route('https://claude.ai/**', route => {
  const url = new URL(route.request().url())
  if (url.pathname.startsWith('/api/')) {
    if (apiDown) return route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"forbidden"}' })
    const body = api(url.pathname)
    return route.fulfill(body ? { status: 200, contentType: 'application/json', body: JSON.stringify(body) } : page404)
  }
  return route.fulfill({ status: 200, contentType: 'text/html', body: html })
})

const page = await context.newPage()
const failures = []
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`)
  if (!ok) failures.push(what)
}
const themeId = () => page.evaluate(() => document.documentElement.getAttribute('data-chameleon'))
const waitTheme = async expected => {
  for (let i = 0; i < 60; i++) {
    const id = await themeId()
    if (expected === null ? id === null : id && id !== 'none' && (expected === true || id === expected)) return id
    await page.waitForTimeout(100)
  }
  return themeId()
}

await page.goto('https://claude.ai/new')
await page.waitForTimeout(800)
const surfaces = () => page.evaluate(() => ({
  frame: getComputedStyle(document.querySelector('.dframe-root')).backgroundColor,
  nav: getComputedStyle(document.querySelector('nav')).backgroundColor,
  send: getComputedStyle(document.querySelector('.send')).backgroundColor,
}))
const stock = await surfaces()
check((await themeId()) === null, 'a page outside any project keeps the stock look')

await page.click('text=Timeline scrubbing')
const film = await waitTheme(true)
check(film === 'video-editor-app', `a chat in "Video editor app" gets that project's theme (${film})`)
const themed = await surfaces()
check(themed.frame !== stock.frame, `the page frame (hsl(var(--df-*)) triplet token) is retinted (${themed.frame})`)
check(themed.nav !== stock.nav, `the sidebar (--df-sidebar-bg on .dframe-root) is retinted (${themed.nav})`)
check(themed.send !== stock.send, `the accent button (--cds-fill-accent hex) is retinted (${themed.send})`)
const strip = await page.evaluate(() => getComputedStyle(document.body, '::before').backgroundImage)
check(strip.includes('svg'), 'the film strip band is drawn across the top')
await page.screenshot({ path: join(shots, 'video-editor.png') })

await page.click('text=Order book feed')
const trading = await waitTheme('day-trading-app')
check(trading === 'day-trading-app', `switching to a "Day trading app" chat switches the theme (${trading})`)
const hrBg = await page.evaluate(() => getComputedStyle(document.querySelector('hr')).backgroundImage)
check(hrBg.includes('svg'), 'divider lines became candlestick strips')
await page.screenshot({ path: join(shots, 'day-trading.png') })

// Design with Claude: the popup asks the page to put the request in the composer...
await page.click('text=Theme design')
await waitTheme('video-editor-app')
const [worker] = context.serviceWorkers()
const composed = await worker.evaluate(async () => {
  const [tab] = await chrome.tabs.query({ url: 'https://claude.ai/*' })
  return chrome.tabs.sendMessage(tab.id, { type: 'compose', text: 'Design a Chameleon theme for this project' })
}).catch(e => ({ error: String(e) }))
check(composed?.ok === true, 'the design request is placed in the chat composer')
check((await page.textContent('.composer .input')).includes('Design a Chameleon theme'), 'the composer holds the request, ready to send')
// ...and when Claude's reply with a ```chameleon block lands, the project switches to it.
replyArrived = true
const designed = await (async () => { for (let i = 0; i < 80; i++) { if ((await themeId()) === 'golden-hour') return 'golden-hour'; await page.waitForTimeout(100) } return themeId() })()
check(designed === 'golden-hour', `Claude's design replaces the starter theme (${designed})`)
await page.screenshot({ path: join(shots, 'designed-by-claude.png') })
await page.click('text=Timeline scrubbing')
await page.waitForTimeout(800)
check((await themeId()) === 'golden-hour', 'other chats in the project use the designed theme')

await page.click('text=Random question')
check((await waitTheme(null)) === null, 'a chat outside any project goes back to stock')
check(JSON.stringify(await surfaces()) === JSON.stringify(stock), 'stock colors restored')

await page.click('text=Video editor app')
check((await waitTheme('golden-hour')) === 'golden-hour', 'the project page reuses its saved theme')

// Claude Code on the web: the session's repository is the project.
await page.click('text=Candlestick widget')
const tabState = () => worker.evaluate(async () => {
  const [tab] = await chrome.tabs.query({ url: 'https://claude.ai/*' })
  return chrome.tabs.sendMessage(tab.id, { type: 'state' })
})
let codeState = null
for (let i = 0; i < 60; i++) {
  codeState = await tabState()
  if (codeState?.info?.kind === 'code' && codeState.theme) break
  await page.waitForTimeout(100)
}
const code = await themeId()
check(Boolean(code) && code !== 'golden-hour', `a Claude Code session gets its own theme (${code})`)
check(codeState?.info?.key === 'code:session_01TestTradingBot' && /bull-desk/.test(codeState.info.idea), `the session is its own project, with its repo as context (${codeState?.info?.idea})`)
check(codeState?.theme?.motif === 'finance', `the session's title picks the motif (${codeState?.theme?.motif})`)
await page.evaluate(json => {
  const pre = document.createElement('pre')
  pre.textContent = json
  document.getElementById('code-reply').append(pre)
}, DESIGN_REPLY.match(/```chameleon\n([\s\S]*?)\n```/)[1])
const codeDesigned = await waitTheme('golden-hour')
check(codeDesigned === 'golden-hour', `a design Claude writes in the session is picked up (${codeDesigned})`)
await page.click('text=Film timeline')
let filmState = null
for (let i = 0; i < 60; i++) {
  filmState = await tabState()
  if (filmState?.info?.key === 'code:session_01TestFilmTimeline' && filmState.theme) break
  await page.waitForTimeout(100)
}
check(filmState?.theme?.motif === 'film' && /film-lab/.test(filmState.info.idea), `another session gets its own theme, not the sidebar's first repo, named from its sidebar entry (${filmState?.theme?.motif}, ${filmState?.info?.idea})`)

// When claude.ai's internal API refuses us, the project is read from the page itself.
apiDown = true
await page.click('text=Order book feed')
check((await waitTheme('day-trading-app')) === 'day-trading-app', 'with the API returning 403, the project is detected from the page')
const report = await worker.evaluate(async () => {
  const [tab] = await chrome.tabs.query({ url: 'https://claude.ai/*' })
  return chrome.tabs.sendMessage(tab.id, { type: 'diagnose' })
}).catch(e => ({ error: String(e) }))
const text = JSON.stringify(report)
check(/lookupError|403/.test(text) && /tokens|token/i.test(text), 'Copy diagnostics returns a report with the API error and token counts')
check(!text.includes('Stream the order book'), 'the diagnostics report leaves out chat content')

await context.close()
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`)
  process.exit(1)
}
console.log('\nall end-to-end checks passed')
