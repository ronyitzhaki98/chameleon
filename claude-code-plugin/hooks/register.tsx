import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ActiveTheme } from '../types'
import { generateTheme, terminalLine, toClaudeCodeTheme } from './core/index.js'

const active = atom({ plugin: 'skinshift', key: 'active' } as const, null)
const designing = atom({ plugin: 'skinshift', key: 'designing' } as const, false)
const bandHidden = atom({ plugin: 'skinshift', key: 'bandHidden' } as const, false)

type Theme = ActiveTheme & { idea: string; logo: string; motif: string }
type Options = { model?: string; auto?: boolean }

const projectKey = (root: string) => `project:${root}`

async function themesDir($: EngineInterface) {
  const configDir = await $.env.get('CLAUDE_CONFIG_DIR')
  const home = await $.env.get('HOME')
  return `${configDir || `${home}/.claude`}/themes`
}

/** Writes the Claude Code theme file and switches the session to it. */
async function applyTheme($: EngineInterface, theme: Theme) {
  const slug = `skinshift-${theme.id}`
  await $.fs.write(`${await themesDir($)}/${slug}.json`, JSON.stringify(toClaudeCodeTheme(theme), null, 2))
  const rows = await $.config.list()
  const current = rows.find(row => row.key === 'theme')
  if (current && !String(current.value).startsWith('custom:skinshift-')) {
    await $.store.set('originalTheme', current.value)
  }
  const result = await $.config.set({ key: 'theme', value: `custom:${slug}` })
  await update($, active, () => ({
    id: theme.id,
    name: theme.name,
    mode: theme.mode,
    pattern: theme.pattern,
    glyphs: theme.glyphs,
    palette: theme.palette,
  }))
  $.ui.status(`${theme.glyphs[0] ?? ''} ${theme.name}`)
  return result
}

/** Puts back the theme the person had before this mod switched it. */
async function restoreTheme($: EngineInterface) {
  const original = await $.store.get('originalTheme')
  const rows = await $.config.list()
  const current = rows.find(row => row.key === 'theme')
  if (original !== undefined && current && String(current.value).startsWith('custom:skinshift-')) {
    await $.config.set({ key: 'theme', value: original as string })
  }
  await update($, active, () => null)
  $.ui.status(undefined)
}

async function design($: EngineInterface, idea: string, options: Options) {
  const root = await $.session.root()
  const projectName = root.split('/').filter(Boolean).pop() ?? ''
  await update($, designing, () => true)
  try {
    const { theme, source, error } = await generateTheme({
      idea,
      projectName,
      complete: async (system: string, prompt: string) => {
        const r = await $.model.complete({ model: options.model || 'sonnet', system, prompt, maxTokens: 2000 })
        if (!r.isAnswered) throw new Error(`model call failed: ${r.reason}`)
        return r.text
      },
    })
    await $.store.set(projectKey(root), theme)
    await applyTheme($, theme as Theme)
    return { theme: theme as Theme, source, error }
  } finally {
    await update($, designing, () => false)
  }
}

export const register: Register = (on, options: Options) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'design',
      description: 'Design a theme for this project (skinshift): /design [idea] | show | off',
      argumentHint: '[idea | show | off]',
    })
    const root = await $.session.root()
    const saved = (await $.store.get(projectKey(root))) as Theme | undefined
    if (saved) await applyTheme($, saved)
    else if (await read($, active)) await restoreTheme($)
    return next(e)
  })

  // The project's first prompt is its idea: design from it without holding the prompt up.
  on('prompt.submit', async ($, e, next) => {
    const result = next(e)
    if (options.auto !== false && e.text.trim().length > 12 && !e.text.trim().startsWith('/')) {
      const root = await $.session.root()
      const isThemed = (await $.store.get(projectKey(root))) !== undefined
      const isOff = (await $.store.get(`off:${root}`)) === true
      if (!isThemed && !isOff && !(await read($, designing))) {
        void design($, e.text, options).then(({ theme }) =>
          $.ui.toast(`${theme.glyphs.slice(0, 3).join(' ')} Themed this project: ${theme.name}`),
        )
      }
    }
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'design' }, async ($, e) => {
    const args = e.args.trim()
    const root = await $.session.root()
    if (args === 'show') {
      const theme = (await $.store.get(projectKey(root))) as Theme | undefined
      return { text: theme ? `${theme.glyphs.join(' ')}  ${theme.name} (${theme.motif}, ${theme.pattern} lines, ${theme.mode})` : 'This project has no theme yet. Run /design <idea>.' }
    }
    if (args === 'off') {
      await $.store.delete(projectKey(root))
      await $.store.set(`off:${root}`, true)
      await restoreTheme($)
      return { text: 'Theme removed for this project; your own theme is back.' }
    }
    let idea = args
    if (!idea) {
      const first = (await $.session.messages()).find(m => m.role === 'user' && m.text.trim())
      const saved = (await $.store.get(projectKey(root))) as Theme | undefined
      idea = saved?.idea || first?.text || root
    }
    await $.store.delete(`off:${root}`)
    const { theme, source, error } = await design($, idea, options)
    const note = source === 'fallback' ? ` (offline motif${error ? `: ${error}` : ''})` : ''
    return { text: `${theme.glyphs.join(' ')}  Designed "${theme.name}"${note}.` }
  })

  // The project's line style, drawn above the prompt in place of a plain rule.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theme = await read($, active)
    const isBusy = await read($, designing)
    if (e.props.hasSurvey || (await read($, bandHidden)) || (!theme && !isBusy)) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    if (!theme) return <Box><Text dimColor>Designing a theme for this project…</Text></Box>
    const label = ` ${theme.glyphs.slice(0, 3).join(' ')} ${theme.name} `
    const width = Math.max(0, (e.props.bodyColumns ?? 80) - label.length - 6)
    const runs = terminalLine(theme, width) as { text: string; color: string }[]
    return (
      <Box>
        {runs.map(run => <Text color={run.color}>{run.text}</Text>)}
        <Text color={theme.palette.accent} bold>{label}</Text>
        <Button key="hide" label="×" onPress={() => update($, bandHidden, () => true)} />
      </Box>
    )
  })
}
