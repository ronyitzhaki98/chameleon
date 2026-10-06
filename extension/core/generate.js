// Turns a project's idea (its first prompt, name or description) into a theme.
//
// Nothing here costs money. The design comes from Claude on the plan the person
// already has, through whichever door the target has:
//   - the Claude Code plugin calls the session's own model ($.model.complete),
//   - the browser extension puts chatDesignPrompt() into the person's claude.ai
//     chat; they press send, and the reply's ```chameleon block is picked up,
//   - the CLI runs `claude -p`.
// `complete(system, prompt)` resolves the reply's text. With no `complete`, or
// when the call fails, the keyword fallback still returns a full theme.

import { MOTIFS, MOTIF_IDS, matchMotif } from './motifs.js'
import { PATTERN_IDS } from './patterns.js'
import { PALETTE_KEYS, normalizeTheme } from './theme.js'

const FIELDS = `- "name": a short evocative theme name (2-3 words)
- "motif": the closest base motif, one of ${MOTIF_IDS.join(', ')}
- "mode": "dark" or "light"
- "palette": hex colors for ${PALETTE_KEYS.join(', ')}. bg/surface/surfaceAlt are three close steps of the background; text must read clearly on all three; accent is the signature color; positive/negative are the domain's good/bad colors (green/red candles for trading)
- "pattern": the line style that replaces plain divider lines, one of ${PATTERN_IDS.join(', ')}
- "icons": 6 Tabler icon names (tabler.io/icons, no brand- icons) that are this project's icon set, most iconic first, e.g. a film project: movie, video, bulb, microphone-2, aperture, player-play
- "logoIcon": the one Tabler icon name for the logo badge
- "glyphs": 5 emoji with the same meaning, for terminals`

export const DESIGN_SYSTEM_PROMPT = `You are a visual designer creating an app skin for a coding assistant's interface.
Given a project idea, design a theme that makes the interface feel like the project's world: tasteful and readable first, themed second.
Reply with ONE JSON object and nothing else, with these keys:
${FIELDS}`

/** What the extension puts in the person's chat: the request and the reply format. */
export function chatDesignPrompt({ idea, projectName }) {
  return [
    `Design a Chameleon theme for this project${projectName ? ` ("${projectName}")` : ''}: an interface skin that makes this workspace feel like the project's world, tasteful and readable first.`,
    idea ? `The project's idea: ${String(idea).slice(0, 1500)}` : null,
    `Reply with a short line about the concept, then one code block fenced as \`\`\`chameleon containing a JSON object with:\n${FIELDS}`,
  ].filter(Boolean).join('\n\n')
}

/** The JSON inside the last ```chameleon block of a message, or null. */
export function extractDesignBlock(text) {
  if (typeof text !== 'string') return null
  const blocks = [...text.matchAll(/```chameleon\s*([\s\S]*?)```/g)]
  return blocks.length ? extractJson(blocks[blocks.length - 1][1]) : null
}

export function designPrompt({ idea, projectName }) {
  return [
    projectName ? `Project name: ${projectName}` : null,
    `Project idea (the user's first prompt):\n"""\n${String(idea || '').slice(0, 4000)}\n"""`,
    'Design the theme now. JSON only.',
  ].filter(Boolean).join('\n\n')
}

/** Pulls the first JSON object out of a reply, tolerating code fences and prose. */
export function extractJson(text) {
  if (typeof text !== 'string') return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inString = false
  for (let i = start; i < body.length; i++) {
    const c = body[i]
    if (inString) {
      if (c === '\\') i++
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) {
      try {
        return JSON.parse(body.slice(start, i + 1))
      } catch {
        return null
      }
    }
  }
  return null
}

export function fallbackTheme({ idea, projectName, resolveIcon }) {
  const motif = matchMotif(`${projectName || ''} ${idea || ''}`)
  const base = MOTIFS[motif]
  return normalizeTheme(
    { ...base, motif, name: projectName ? `${projectName}` : base.name, idea },
    { idea, fallbackMotif: motif, resolveIcon },
  )
}

/**
 * @param {{ idea: string, projectName?: string, complete?: (system: string, prompt: string) => Promise<string> }} args
 * @returns {Promise<{ theme: object, source: 'model' | 'fallback', error?: string }>}
 */
export async function generateTheme({ idea, projectName, complete, resolveIcon }) {
  const fallbackMotif = matchMotif(`${projectName || ''} ${idea || ''}`)
  if (typeof complete !== 'function') {
    return { theme: fallbackTheme({ idea, projectName, resolveIcon }), source: 'fallback' }
  }
  try {
    const reply = await complete(DESIGN_SYSTEM_PROMPT, designPrompt({ idea, projectName }))
    const json = extractJson(reply)
    if (!json) throw new Error('the reply held no JSON object')
    return { theme: normalizeTheme({ ...json, idea }, { idea, fallbackMotif, resolveIcon }), source: 'model' }
  } catch (error) {
    return { theme: fallbackTheme({ idea, projectName, resolveIcon }), source: 'fallback', error: String(error?.message || error) }
  }
}
