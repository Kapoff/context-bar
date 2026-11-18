import { expect, test } from 'claude-code/testing'

const BAND = { plugin: 'context-bar', component: 'AbovePrompt', props: { hasSurvey: false } } as const

for (const isCollapsed of [true, false]) {
  test(`band draws on every surface, collapsed=${isCollapsed}`, async ($, on) => {
    on('state.get', (_, e: any) => {
      const key = e.key ?? e.ref?.key
      if (key === 'fill') return { value: { value: { tokens: 150_000, window: 220_000 } } }
      if (key === 'collapsed') return { value: { value: isCollapsed } }
      return { value: { value: false } }
    })
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...BAND, surface } as any)
      const chevron = await ui.find({ type: 'Button', key: 'chevron' } as any)
      expect(chevron).toBeTruthy()
      await ui.unmount()
    }
  })
}
