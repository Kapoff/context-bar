# context-bar

A Claude Code mod (desktop and terminal) that adds a thin context-usage bar above the prompt with warnings when the context starts to grow above a threshold and an auto compact prompt generator.  
<img width="568" height="115" alt="image" src="https://github.com/user-attachments/assets/df6fe8eb-3e12-474c-83c8-7b23afbc4a5f" />


## What it does

- A chevron toggles two states, and the choice persists:
  - Collapsed: a 4px bar only for less visual clutter.
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
