# Architecture

## The idea in one picture

```
 first prompt ──► generateTheme() ──► theme document ──┬─► toClaudeAiCss()      ──► browser extension / desktop injector
 (or /design)     model call, or                       ├─► toClaudeCodeTheme()  ──► ~/.claude/themes/*.json + /theme
                  keyword fallback                     └─► terminalLine()       ──► Claude Code band above the prompt
```

One **theme document** per project (`core/theme.js`): a name, a mode, ten palette colors, a line style (`pattern`), six real icons (`icons`, Tabler names), a logo icon (`logoIcon`, drawn as an app-icon badge by `core/art.js`), and emoji (`glyphs`) for terminals. Every target compiles from it, so a project looks related everywhere it shows up.

## Free by design

- **Icons:** the Tabler set (MIT) is bundled in `core/icons/tabler.js`, so there is no icon service, key or network call. The model names icons or describes them; `resolveIcon()` maps that to a real icon.
- **The design itself:** always Claude on the person's existing plan. Claude Code uses the session's own model; the extension asks in the person's own chat (they press send); the CLI runs `claude -p`. No API key anywhere.
- **Without any design:** every project gets a starter theme from the motif library, matched to its first prompt.

## What can be themed where

Findings from researching each surface (October 2026).

### claude.ai (web): fully possible, supported route

- claude.ai colors itself from Tailwind tokens held as HSL triplets on `:root` (`--bg-000`…`--bg-500`, `--text-000`…`--text-500`, `--accent-main-*`, `--accent-brand`, `--border-*`, `--danger-*`). Overriding them recolors the whole app.
- Decorations ride on pseudo-elements of `<html>` and `<body>` (top band, logo badge) and on `hr` / `[role=separator]` (line styles), so they don't depend on the app's markup.
- A browser extension is the normal, supported way to restyle a website for yourself. Everything is scoped to `html[data-chameleon]`, so removing the attribute restores the stock look.
- Token names are claude.ai internals and can change. They are all in `toClaudeAiCss()` in `core/compile.js`, so a change is a one-place fix.

### Detecting the project: works, uses internal endpoints

`core/claudeai-detect.js` runs in the page with your own session and calls the same JSON endpoints the web app uses:

- `/chat/<id>` → `chat_conversations/<id>` → `project_uuid`
- `/project/<id>` → `projects/<id>` for the name and description
- the project's oldest chat → its first human message is the project's **idea**

These endpoints are undocumented. If they change, detection returns nothing and the page simply stays stock. Chats outside a project are left alone unless you turn on "Also theme chats that are not in a project".

### Claude Code: fully possible, official plugin APIs

- **Custom themes** are JSON files in `~/.claude/themes/<slug>.json` (`name`, `base`, `overrides` keyed by semantic color: `claude`, `promptBorder`, `success`, `error`, `diffAdded`…), selected with `/theme` and stored as `custom:<slug>`. The plugin writes one per project and switches to it with `$.config.set({ key: 'theme' })`.
- **Function hooks** (`claude-code-plugin/hooks/register.tsx`):
  - `session.start`: re-applies the project's saved theme (the project is the session's root folder), or restores your own theme.
  - `prompt.submit`: the first real prompt in an unthemed project starts a design in the background; the prompt is never held up.
  - `command.run` `/design`: redesign, show, off.
  - `ui.render` `AbovePrompt`: the line style band. It draws on the desktop app's Code tab too.
  - `$.model.complete`: the design call uses the session's own model access.
- Limits: a terminal can't show images, so the logo appears only in the browser and desktop targets; the terminal gets the colors, the line style in box-drawing characters and the emoji icons.

### Claude Desktop: possible only by modifying the app (flagged)

- Claude Desktop is an Electron shell that loads claude.ai. It has no theme setting, extension or plugin API for the chat window ([feature request](https://github.com/anthropics/claude-code/issues/85115)).
- The only working route is to patch the installed app's `app.asar` so the main process calls `webContents.insertCSS()` on each window, which is what [claude-desktop-theme](https://github.com/RemyMachado/claude-desktop-theme) and [claude-desktop-bin's themes](https://github.com/patrickjaja/claude-desktop-bin/tree/master/themes) do.
- **Risks**, all of which apply to `desktop/`:
  - It modifies Anthropic's distributed application. That may conflict with Anthropic's terms of service, which generally prohibit modifying their software; check the current terms before using it. Do not redistribute a patched app.
  - Every app update replaces `app.asar` and removes the patch.
  - On macOS and Windows, Electron's ASAR integrity check makes a modified archive fail to launch unless the hash embedded in the signed executable is updated and the app re-signed. The patcher does not do that and refuses those platforms without `--force`.
  - The injected code runs with the app's full privileges.
- So it ships as an opt-in, Linux-first experiment. The browser extension is the recommended route for the chat UI.

### "/design"

The brief asks for themes "generated via /design". There is no public API for Claude's design tools that another app can call, so Chameleon's `/design` is its own command (Claude Code) and "Design with Claude" button (extension popup) that asks Claude to act as the designer and return a structured theme (palette, motif, line style, icon names, logo icon). The model never draws the artwork itself: logos, icons and line styles are composed from the bundled icon set and hand-drawn patterns, which is what keeps them looking consistent.

## Data and privacy

- Extension: themes live in `chrome.storage.local`. It talks to nothing but claude.ai, as you; the design request is a normal message in your own chat.
- Claude Code: themes live in the plugin's store and `~/.claude/themes/`.
- Desktop: `~/.chameleon/config.json` (key, model) and `~/.chameleon/themes/`.

## Ideas for later

- Theme previews before applying, and a "shuffle" for alternatives.
- Sync themes between the extension and Claude Code by project name.
- Per-chat accents inside a project.
