# `agent-os/hooks/`

Claude Code hooks — shell commands that fire on session events (e.g. before/after tool calls, on prompt submit). Exposed at `.claude/hooks/` via symlink.

## When to put a file here

- A **hook script** (shell or any executable) that should run on a Claude Code event.
- Configuration that registers a hook in `settings.json` (typically `.claude/settings.local.json`) and the script it invokes.

## File shape

```
agent-os/hooks/<event-name>/<hook-name>.sh
```

```sh
#!/usr/bin/env sh
# Hook: <event-name>
# Purpose: <one line>
# Registered in .claude/settings.local.json
set -e

# Read JSON event payload from stdin (Claude Code sends it as JSON)
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Your logic here — exit 0 to allow, non-zero to block
case "$TOOL_NAME" in
  Write|Edit) echo "Logging write to $TOOL_NAME" ;;
esac
```

Make it executable: `chmod +x agent-os/hooks/<event-name>/<hook-name>.sh`.

## Common event names (Claude Code)

| Event              | Fires when                                     |
| ------------------ | ---------------------------------------------- |
| `PreToolUse`       | Before any tool call — exit non-zero to block  |
| `PostToolUse`      | After any tool call succeeds                   |
| `UserPromptSubmit` | When the user submits a prompt                 |
| `Stop`             | When Claude finishes responding                |
| `Notification`     | On UI notifications (permission prompts, etc.) |

Refer to Claude Code's settings docs for the full schema and how to register a hook in `settings.json`.

## Authoring tips

- Use the `update-config` skill (Claude Code) to wire a hook into `settings.json` correctly.
- Use the `hookify:hookify` skill to generate hooks from natural-language descriptions.
- Hooks are **machine-local** by default (registered in `.claude/settings.local.json`, which is gitignored). To share across the team, register in `.claude/settings.json` (tracked) and commit the scripts here.

## Discovery

- **Claude Code**: reads from `.claude/hooks/` (symlink → `agent-os/hooks/`); registration is via `.claude/settings.json` or `.claude/settings.local.json`.
- **Cursor**: does not natively read hooks. Cursor-equivalent automations go through agent-os/rules/ instead.

## Related

- Skill: `hookify:hookify` (generates hooks)
- Skill: `update-config` (writes settings.json safely)
