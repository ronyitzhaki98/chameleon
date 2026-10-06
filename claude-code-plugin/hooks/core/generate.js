// Turns a project's idea (its first prompt, name or description) into a theme.
//
// The model call is injected, so each target brings its own transport:
//   - the browser extension calls the Messages API with the user's key,
//   - the Claude Code plugin uses the session's own client ($.model.complete),
//   - the CLI uses fetch from Node.
// `complete(system, prompt)` resolves the reply's text. With no `complete`, or
// when the call fails, the keyword fallback still returns a full theme.

import { MOTIFS, MOTIF_IDS, matchMotif } from './motifs.js'
import { PATTERN_IDS } from './patterns.js'
import { PALETTE_KEYS, normalizeTheme } from './theme.js'

export const DESIGN_SYSTEM_PROMPT = `You are a visual designer creating an app skin for a coding assistant's interface.
Given a project idea, design a theme that makes the interface feel like the project's world.
Reply with ONE JSON object and nothing else, with these keys:
- "name": a short evocative theme name (2-3 words)
- "motif": the closest base motif, one of ${MOTIF_IDS.join(', ')}
- "mode": "dark" or "light"
- "palette": hex colors for ${PALETTE_KEYS.join(', ')}. text must read clearly on bg and surface; positive/negative are the domain's good/bad colors (e.g. green/red candles for trading)
- "pattern": the decorative line style that replaces plain divider lines, one of ${PATTERN_IDS.join(', ')}
- "glyphs": 5 emoji that are this project's icon set (e.g. a film project: clapperboard, movie camera, light bulb)
- "logo": a simple flat SVG logo, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">...</svg>, only path/rect/circle/ellipse/line/polyline/polygon, using fill="currentColor" for the main shape, under 1500 characters, no text, no scripts, no images`

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

export function fallbackTheme({ idea, projectName }) {
  const motif = matchMotif(`${projectName || ''} ${idea || ''}`)
  const base = MOTIFS[motif]
  return normalizeTheme(
    { ...base, motif, name: projectName ? `${projectName}` : base.name, idea },
    { idea, fallbackMotif: motif },
  )
}

/**
 * @param {{ idea: string, projectName?: string, complete?: (system: string, prompt: string) => Promise<string> }} args
 * @returns {Promise<{ theme: object, source: 'model' | 'fallback', error?: string }>}
 */
export async function generateTheme({ idea, projectName, complete }) {
  const fallbackMotif = matchMotif(`${projectName || ''} ${idea || ''}`)
  if (typeof complete !== 'function') {
    return { theme: fallbackTheme({ idea, projectName }), source: 'fallback' }
  }
  try {
    const reply = await complete(DESIGN_SYSTEM_PROMPT, designPrompt({ idea, projectName }))
    const json = extractJson(reply)
    if (!json) throw new Error('the reply held no JSON object')
    return { theme: normalizeTheme({ ...json, idea }, { idea, fallbackMotif }), source: 'model' }
  } catch (error) {
    return { theme: fallbackTheme({ idea, projectName }), source: 'fallback', error: String(error?.message || error) }
  }
}
