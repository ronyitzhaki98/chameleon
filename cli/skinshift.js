#!/usr/bin/env node
// skinshift design "<idea>" [--name <project>] [--claude-code]   design a theme (uses ANTHROPIC_API_KEY when set)
// skinshift preview [--out docs/preview.html]                    write a gallery of the built-in motifs
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  MOTIFS, anthropicComplete, generateTheme, normalizeTheme, renderPattern, svgDataUri, toClaudeCodeTheme,
} from '../core/index.js'

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
  const key = process.env.ANTHROPIC_API_KEY
  const { theme, source, error } = await generateTheme({
    idea,
    projectName: typeof name === 'string' ? name : undefined,
    complete: key ? anthropicComplete({ apiKey: key, model: process.env.SKINSHIFT_MODEL }) : undefined,
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
} else if (command === 'preview') {
  const out = flag('--out') || 'docs/preview.html'
  const cards = Object.keys(MOTIFS).map(id => {
    const t = normalizeTheme({ ...MOTIFS[id], motif: id })
    const p = t.palette
    const strip = svgDataUri(renderPattern(t.pattern, p).svg)
    return `<section style="background:${p.bg};color:${p.text};border:1px solid ${p.border}">
      <header><span class="logo" style="background:${p.surface};color:${p.accent}">${t.logo}</span><b>${t.name}</b><small style="color:${p.textMuted}">${id} · ${t.pattern}</small></header>
      <div class="strip" style="background-image:url('${strip}')"></div>
      <div class="bubble" style="background:${p.surfaceAlt}">${t.glyphs.join(' ')}</div>
      <div class="sw">${Object.values(p).map(c => `<i style="background:${c}"></i>`).join('')}</div>
      <button style="background:${p.accent};color:${p.bg}">Send</button>
    </section>`
  })
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>Skinshift motifs</title>
<style>body{font:14px system-ui;margin:24px;background:#0e0e0e;color:#eee}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
section{border-radius:14px;padding:14px;display:grid;gap:10px}header{display:flex;gap:10px;align-items:center}header small{margin-left:auto}
.logo{width:34px;height:34px;border-radius:9px;display:grid;place-items:center}.logo svg{width:22px;height:22px}
.strip{height:16px;background-repeat:repeat-x;background-size:auto 16px}.bubble{padding:10px;border-radius:10px;font-size:20px}
.sw{display:flex;gap:3px}.sw i{width:18px;height:18px;border-radius:4px}button{border:0;border-radius:8px;padding:6px 12px;justify-self:end}</style>
<h1>Skinshift built-in motifs</h1><p>The offline fallback library. With a model, themes are designed per project and can mix any of these parts.</p><main>${cards.join('')}</main>`)
  console.log(`wrote ${out}`)
} else {
  console.error('usage: skinshift design "<idea>" [--name <project>] [--claude-code] | skinshift preview [--out file]')
  process.exit(1)
}
