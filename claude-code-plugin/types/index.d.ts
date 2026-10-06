export type ActiveTheme = {
  id: string
  name: string
  mode: 'dark' | 'light'
  pattern: string
  glyphs: string[]
  palette: Record<string, string>
}

declare module 'claude-code' {
  interface PluginState {
    'skinshift': { active: ActiveTheme | null; designing: boolean; bandHidden: boolean }
  }
}
