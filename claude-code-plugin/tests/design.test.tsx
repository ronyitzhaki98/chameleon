import { describe, expect, mock, test } from 'claude-code/testing'

const DESIGN = JSON.stringify({
  name: 'Cutting Room',
  motif: 'film',
  mode: 'dark',
  palette: { bg: '#111111', surface: '#1c1c1c', surfaceAlt: '#262626', text: '#f5f0e6', textMuted: '#a0a0a0', accent: '#f5c518', accent2: '#e2483d', positive: '#5bc07a', negative: '#e2483d', border: '#3a3a3a' },
  pattern: 'filmstrip',
  glyphs: ['🎬', '🎥', '💡', '🎞️', '🎙️'],
  logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="4" y="13" width="24" height="15" fill="currentColor" onload="alert(1)"/><script>alert(1)</script></svg>',
})

// What the engine beneath the plugin answers in a session; tests add the rest.
function engine(on: any, root: string) {
  on('session.start', async (_$: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('command.register', async () => ({ value: undefined }))
  on('session.root', async () => ({ value: root }))
  on('session.messages', async () => ({ value: [] }))
  mock.env(on, { HOME: '/home/test' })
  mock.store(on)
}

describe('chameleon', () => {
  test('/design designs a theme, writes the Claude Code theme file and switches to it', async ($, on) => {
    const written: Record<string, string> = {}
    const configSets: unknown[] = []
    let prompt = ''
    on('model.complete', async (_$, e) => {
      prompt = e.prompt
      return { value: { isAnswered: true, text: `Here you go:\n\`\`\`json\n${DESIGN}\n\`\`\``, usage: { inputTokens: 1, outputTokens: 1 } } } as never
    })
    on('fs.write', async (_$, e) => {
      written[e.path] = e.text
      return { value: undefined }
    })
    on('config.list', async () => ({ value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: 'dark', provider: { kind: 'engine' }, isLocked: false }] }) as never)
    on('config.set', async (_$, e) => {
      configSets.push(e.value)
      return { value: e.value }
    })

    engine(on, '/work/video-editor')
    await $.session.start({ cwd: '/work/video-editor', surface: 'terminal', isInteractive: true } as never)
    const out = await $.command.run({ command: 'design', args: 'I want to build a software for video editing' } as never)

    expect(JSON.stringify(out)).toContain('Cutting Room')
    expect(prompt).toContain('video editing')
    expect(configSets).toContain('custom:chameleon-cutting-room')
    const file = Object.entries(written).find(([path]) => path.endsWith('/themes/chameleon-cutting-room.json'))
    expect(file).toBeDefined()
    const cc = JSON.parse(file![1])
    expect(cc.base).toBe('dark')
    expect(cc.overrides.claude).toBe('#f5c518')

    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ plugin: 'chameleon', surface, component: 'AbovePrompt', props: { bodyColumns: 80, hasSurvey: false } as never })
      expect(await ui.find({ type: 'Text', text: /Cutting Room/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /▮▯/ })).toBeDefined()
    }
  })

  test('/design falls back to the offline motif library when the model call fails', async ($, on) => {
    on('model.complete', async () => ({ value: { isAnswered: false, reason: 'api-error', status: 500, error: 'boom' } }) as never)
    on('fs.write', async () => ({ value: undefined }))
    on('config.list', async () => ({ value: [] }))
    on('config.set', async (_$, e) => ({ value: e.value }))
    engine(on, '/work/trader')
    await $.session.start({ cwd: '/work/trader', surface: 'terminal', isInteractive: true } as never)
    const out = await $.command.run({ command: 'design', args: 'a day trading app with candlestick charts' } as never)
    expect(JSON.stringify(out)).toContain('offline motif')
    expect(JSON.stringify(out)).toContain('📈')
  })

  test('the first prompt themes a new project, and another project gets its own theme or the original back', async ($, on) => {
    let root = '/work/video-editor'
    const configSets: unknown[] = []
    let current: unknown = 'dark'
    on('session.start', async (_$, e) => ({ cwd: e.cwd }))
    on('command.register', async () => ({ value: undefined }))
    on('session.root', async () => ({ value: root }))
    on('session.messages', async () => ({ value: [] }))
    mock.env(on, { HOME: '/home/test' })
    mock.store(on)
    on('prompt.submit', async (_$, e) => ({ text: e.text }) as never)
    on('model.complete', async () => ({ value: { isAnswered: true, text: DESIGN, usage: { inputTokens: 1, outputTokens: 1 } } }) as never)
    on('fs.write', async () => ({ value: undefined }))
    on('config.list', async () => ({ value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: current, provider: { kind: 'engine' }, isLocked: false }] }) as never)
    on('config.set', async (_$, e) => {
      configSets.push(e.value)
      current = e.value
      return { value: e.value }
    })

    await $.session.start({ cwd: root, surface: 'terminal', isInteractive: true } as never)
    await $.prompt.submit({ text: 'I want to build a software for video editing', wait: false } as never)
    for (let i = 0; i < 100 && !configSets.includes('custom:chameleon-cutting-room'); i++) await new Promise(r => setTimeout(r, 10))
    expect(configSets).toContain('custom:chameleon-cutting-room')

    // A project with no theme yet: the person's own theme comes back.
    root = '/work/notes'
    await $.session.start({ cwd: root, surface: 'terminal', isInteractive: true } as never)
    expect(current).toBe('dark')

    // Back to the film project: its saved theme returns without a model call.
    root = '/work/video-editor'
    await $.session.start({ cwd: root, surface: 'terminal', isInteractive: true } as never)
    expect(current).toBe('custom:chameleon-cutting-room')
  })
})
