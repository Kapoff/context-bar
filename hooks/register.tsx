import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Fill } from '../types'

// Context bar: tokens in the live window, levels at 120k / 150k / 200k (same as the Stop-hook toast).
// Chevron toggles; collapsed = chevron + bare full-width bar, no text, (remembered across sessions via $.store).
// Compact button: Haiku reads the RECENT conversation (texts + tool names, no tool output) and drafts
// "/compact <focus>" into the prompt box. Nothing is sent; the person reviews and presses Enter.
// $.model.complete sends no tools, MCP connectors, plugins, history or session system prompt:
// only the CLI identity block, SYSTEM below and the excerpt.

const fill = atom({ plugin: 'context-bar', key: 'fill' } as const, null)
const busy = atom({ plugin: 'context-bar', key: 'busy' } as const, false)
const collapsed = atom({ plugin: 'context-bar', key: 'collapsed' } as const, false)

const SOFT = 120_000
const RED = 150_000
const DEFCON = 200_000
const MAX_CHARS = 40_000 // ~10k tokens: the recent tail only; older work is what compaction may drop
const MAX_MSGS = 40

const SYSTEM = `You write the focus argument for Claude Code's /compact command: what the compactor must KEEP
and may DROP. Not a summary. Base it on the latest user requests in the excerpt.
Output one line, at most 30 words, exactly this form:
Keep: <phrase>; <phrase>; <phrase>. Drop: <phrase>; <phrase>.
3 to 5 Keep phrases, 1 to 3 Drop phrases, each at most 6 words, naming categories, not details.
Example: Keep: context-bar mod code and paths; collapsed-bar UI requirements; MSIX registry gotcha. Drop: finished toast debugging; raw tool output.
No status, no progress, no parentheses, no invented facts. Output the line only, without "/compact".`

const level = (t: number) => (t >= DEFCON ? 3 : t >= RED ? 2 : t >= SOFT ? 1 : 0)
const colorOf = (t: number) => ['subtle', 'warning', 'error', 'error'][level(t)] ?? 'subtle'
const k = (n: number) => `${Math.round(n / 1000)}k`
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + ' …' : s)

async function measure($: EngineInterface) {
  const { context } = await $.session.usage()
  if (context.tokens === undefined) return
  // bar scale = auto-compact point when set (CLAUDE_CODE_AUTO_COMPACT_WINDOW), else the model window
  const ac = Number(await $.env.get('CLAUDE_CODE_AUTO_COMPACT_WINDOW'))
  const window = ac > 0 && ac < context.window ? ac : context.window
  const f: Fill = { tokens: context.tokens, window }
  await update($, fill, () => f)
}

async function toggle($: EngineInterface) {
  const v = !(await read($, collapsed))
  await update($, collapsed, () => v)
  await $.store.set('collapsed', v)
}

async function draftCompact($: EngineInterface) {
  if (await read($, busy)) return
  await update($, busy, () => true)
  try {
    const msgs = (await $.session.messages()).slice(-MAX_MSGS)
    const lines: string[] = []
    for (const m of msgs) {
      const tools = [...new Set(m.toolUses.map(t => t.tool))].join(', ')
      const body = clip(m.text ?? '', m.role === 'user' ? 1500 : 600)
      if (!body && !tools) continue
      lines.push(`${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${body}${tools ? ` [tools: ${tools}]` : ''}`)
    }
    let text = lines.join('\n')
    if (text.length > MAX_CHARS) text = text.slice(-MAX_CHARS)
    if (!text) {
      $.ui.toast('Context bar: nothing to summarize yet')
      return
    }
    const r = await $.model.complete({
      model: 'haiku',
      system: SYSTEM,
      prompt: `<excerpt>\n${text}\n</excerpt>\nWrite the focus line.`,
      maxTokens: 80,
      effort: 'low',
      timeoutMs: 60_000,
    })
    if (!r.isAnswered) {
      $.ui.toast(`Context bar: Haiku failed (${r.reason}); plain /compact filled`)
      await $.prompt.fill({ text: '/compact ' })
      return
    }
    const focus = r.text.trim().replace(/^\/compact\s*/i, '').replace(/\s*\n+\s*/g, ' ')
    await $.prompt.fill({ text: `/compact ${focus}` })
  } finally {
    await update($, busy, () => false)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    const c = (await $.store.get('collapsed')) === true
    await update($, collapsed, () => c)
    await update($, busy, () => false)
    await measure($)
    return r
  })

  on('session.measure', async ($, e, next) => {
    const r = await next(e)
    await measure($)
    return r
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const f = await read($, fill)
    if (e.props.hasSurvey || f === null) return next(e)
    const isBusy = await read($, busy)
    const isCollapsed = await read($, collapsed)
    const ui = $.ui.resolve(e)
    const { Box, Button, Progress } = ui
    const lv = level(f.tokens)
    const color = colorOf(f.tokens)
    const pct = Math.max(0, Math.min(100, Math.round((f.tokens / f.window) * 100)))
    const figures = `${k(f.tokens)} / ${k(f.window)} (${pct}%)`
    const label = ['Context', 'Context: wrap up soon', 'Context: compact now', 'Context: DEFCON 1'][lv] ?? 'Context'
    const chevron = (
      <Button key="chevron" plain dimColor label={isCollapsed ? '›' : '⌄'} onPress={() => toggle($)} />
    )

    if (isCollapsed) {
      // no text. Terminal: one row of Boxes; desktop: button + 4px track
      if (!('Svg' in ui)) {
        return (
          <Box flexDirection="row" gap="sm" alignItems="center">
            {chevron}
            <Box flexGrow={1} flexDirection="row" height={1}>
              <Box width={`${pct}%`} height={1} backgroundColor={lv === 0 ? 'claude' : color} />
              <Box flexGrow={1} height={1} backgroundColor="subtle" />
            </Box>
          </Box>
        )
      }
      // invisible one-row frame (~20px) centers a 4px track (20% of it); plain Boxes stretch to full width. The band card is the app's
      const hex = ['#9a9a9a', '#e5a50a', '#f07178', '#f07178'][lv] ?? '#9a9a9a'
      return (
        <Box flexDirection="row" gap="sm" alignItems="center">
          {chevron}
          <Box flexGrow={1} height={1} flexDirection="column" justifyContent="center">
            <Box width="100%" height="20%" flexDirection="row" backgroundColor="#3c3c3c">
              <Box width={`${pct}%`} height="100%" backgroundColor={hex} />
            </Box>
          </Box>
        </Box>
      )
    }

    return (
      <Box flexDirection="row" gap="sm" alignItems="center">
        {chevron}
        <Box flexGrow={1}>
          <Progress label={label} value={f.tokens} max={f.window} valueText={figures} color={color} />
        </Box>
        <Button key="compact" plain label={isBusy ? 'Drafting…' : 'Compact'} onPress={() => draftCompact($)} />
      </Box>
    )
  })
}
