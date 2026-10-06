#!/usr/bin/env node
// skinshift design "<idea>" [--name <project>] [--claude-code]   design a theme with Claude Code (`claude -p`, your own plan)
// skinshift prompt "<idea>" [--name <project>]                    print the design request to paste into any Claude chat
// skinshift preview [--out docs/preview.html]                    write a gallery of the built-in motifs
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  MOTIFS, chatDesignPrompt, generateTheme, iconSvg, logoSvg, normalizeTheme, renderPattern, resolveIcon, svgDataUri, toClaudeCodeTheme,
} from '../core/index.js'

// Claude Code in print mode: the design runs on the plan the person already has.
const claudeCode = async (system, prompt) =>
  execFileSync('claude', ['-p', '--append-system-prompt', system, prompt], { encoding: 'utf8', maxBuffer: 1 << 22 })

const [, , command, ...rest] = process.argv
const flag = name => {
  const i = rest.indexOf(name)
  return i >= 0 ? rest.splice(i, 2)[1] ?? true : undefined
}

if (command === 'design') {
  const name = flag('--name')
  const toClaudeCode = flag('--claude-code') !== undefined
  const idea = rest.join(' ')
  if (!idea) {
    console.error('usage: skinshift design "<idea>" [--name <project>] [--claude-code]')
    process.exit(1)
  }
  const { theme, source, error } = await generateTheme({
    idea,
    projectName: typeof name === 'string' ? name : undefined,
    complete: claudeCode,
    resolveIcon,
  })
  if (error) console.error(`model call failed, used the offline motif: ${error}`)
  if (toClaudeCode) {
    const file = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'themes', `skinshift-${theme.id}.json`)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(toClaudeCodeTheme(theme), null, 2))
    console.error(`wrote ${file}; pick it with /theme in Claude Code`)
  }
  console.error(`${theme.glyphs.join(' ')}  ${theme.name} (${source})`)
  console.log(JSON.stringify(theme, null, 2))
} else if (command === 'prompt') {
  const name = flag('--name')
  console.log(chatDesignPrompt({ idea: rest.join(' '), projectName: typeof name === 'string' ? name : undefined }))
} else if (command === 'preview') {
  const out = flag('--out') || 'docs/preview.html'
  const cards = Object.keys(MOTIFS).map(id => {
    const t = normalizeTheme({ ...MOTIFS[id], motif: id }, { resolveIcon })
    const p = t.palette
    const strip = svgDataUri(renderPattern(t.pattern, p).svg)
    return `<section style="background:${p.bg};color:${p.text};border:1px solid ${p.border}">
      <header><span class="logo">${logoSvg(t, 40)}</span><b>${t.name}</b><small style="color:${p.textMuted}">${id} · ${t.pattern}</small></header>
      <div class="strip" style="background-image:url('${strip}');height:${renderPattern(t.pattern, p).height}px;background-size:auto ${renderPattern(t.pattern, p).height}px"></div>
      <div class="bubble" style="background:${p.surfaceAlt}">${t.icons.map(n => iconSvg(n, { color: p.accent, size: 24 })).join('')}</div>
      <div class="sw">${Object.values(p).map(c => `<i style="background:${c}"></i>`).join('')}</div>
      <button style="background:${p.accent};color:${p.bg}">Send</button>
    </section>`
  })
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>Skinshift motifs</title>
<style>body{font:14px system-ui;margin:24px;background:#0e0e0e;color:#eee}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
section{border-radius:14px;padding:14px;display:grid;gap:10px}header{display:flex;gap:10px;align-items:center}header small{margin-left:auto}
.logo{width:40px;height:40px}
.strip{background-repeat:repeat-x;background-position:left center}.bubble{padding:12px;border-radius:10px;display:flex;gap:14px}
.sw{display:flex;gap:3px}.sw i{width:18px;height:18px;border-radius:4px}button{border:0;border-radius:8px;padding:6px 12px;justify-self:end}</style>
<h1>Skinshift built-in motifs</h1><p>The starter themes every new project gets for free. "Design with Claude" makes a custom one from any palette, line style and icons.</p><main>${cards.join('')}</main>`)
  console.log(`wrote ${out}`)
} else {
  console.error('usage: skinshift design "<idea>" [--name <project>] [--claude-code] | skinshift prompt "<idea>" | skinshift preview [--out file]')
  process.exit(1)
}
