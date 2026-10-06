# Claude Desktop (experimental, unofficial)

> **Read this first.** This modifies your installed copy of Claude Desktop. It is not supported by Anthropic, may conflict with Anthropic's terms of service, breaks on every app update, and on macOS and Windows will stop the app from launching unless you also deal with Electron's ASAR integrity check (this tool does not). If you just want themed chats, use the browser extension on claude.ai instead.

## What it does

`desktop/patch.mjs` backs up the app's `app.asar`, adds a `skinshift/` folder with the injector, the claude.ai project detector and the theme core, and puts one guarded line at the top of the app's main entry:

```js
/* skinshift */ try { require('./skinshift/injector.cjs').install() } catch (e) { console.warn('skinshift', e) }
```

The injector watches each window that shows claude.ai, detects the open project and applies its theme with `webContents.insertCSS()`, swapping it as you move between chats. A failure in the injector is caught, so it can't stop the app from starting.

## Use (Linux)

```bash
# optional settings: { "auto": true, "themeChats": false }
mkdir -p ~/.skinshift && echo '{ "auto": true }' > ~/.skinshift/config.json

node desktop/patch.mjs status              # finds app.asar, or pass --app <path>
sudo node desktop/patch.mjs install        # backs up, patches; restart Claude Desktop
sudo node desktop/patch.mjs uninstall      # restores the backup
```

After an app update, run `install` again.

## Tested

- `test/desktop-injector.test.js`: applies a theme on a project chat, swaps it on navigation, removes it outside projects (against a fake `webContents`).
- The patcher has been run against a stand-in `app.asar` (install, status, run the patched entry, uninstall).
- It has **not** been run against a real Claude Desktop install. The app's entry point can change between versions; if the app's main entry is an ES module, the guarded `require` line does nothing and the app starts unthemed.
