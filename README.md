# context-bar

A Claude Code mod (desktop and terminal) that adds a thin context-usage bar above the prompt.

## What it does

- A chevron toggles two states, and the choice persists:
  - Collapsed: a 4px bar only.
  - Expanded: a progress bar showing tokens / window, plus a Compact button.
- Bar color by token count: grey below 120k, yellow from 120k, red from 150k.
- Bar scale is `CLAUDE_CODE_AUTO_COMPACT_WINDOW` if set, otherwise the model's context window.
- Compact button: asks Haiku to draft a one-line "Keep: ...; Drop: ..." focus, then fills the prompt with `/compact <focus>`. You review and send it. Haiku gets no tools, no MCP and no history, only a clipped excerpt of recent messages.

## Install

Type at the prompt of a terminal session:

```
/plugin install context-bar --marketplace Kapoff/context-bar
```

Then press `y` to add the marketplace and pick a scope.

## Develop

```
claude plugin validate .
claude plugin test .
```
