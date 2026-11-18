export type Fill = { tokens: number; window: number }

declare module 'claude-code' {
  interface PluginState {
    'context-bar': { fill: Fill | null; busy: boolean; collapsed: boolean }
  }
}
