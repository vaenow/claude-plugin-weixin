---
name: configure
description: Set up the WeChat channel — scan QR code to login, check channel status. Use when the user asks to configure WeChat, login, or check channel status.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(ls *)
  - Bash(mkdir *)
  - Bash(bun *)
---

# /weixin:configure — WeChat Channel Setup

Manages WeChat iLink Bot login and credential storage. Credentials live in
`~/.claude/channels/weixin/credentials.json`.

Arguments passed: `$ARGUMENTS`

---

## Dispatch on arguments

### No args — status and guidance

Read both state files and give the user a complete picture:

1. **Credentials** — check `~/.claude/channels/weixin/credentials.json` for
   `token` and `baseUrl`. Show set/not-set; if set, show token first 6 chars
   masked.

2. **Access** — read `~/.claude/channels/weixin/access.json` (missing file
   = defaults: `dmPolicy: "pairing"`, empty allowlist). Show:
   - DM policy and what it means
   - Allowed senders: count and list
   - Pending pairings: count with codes and sender IDs

3. **What next** — concrete next step based on state:
   - No credentials → *"Run `/weixin:configure login` to scan QR code and connect."*
   - Credentials set, nobody allowed → *"Send a message to the bot on WeChat. It replies with a code; approve with `/weixin:access pair <code>`."*
   - Credentials set, someone allowed → *"Ready. Message the bot on WeChat to reach the assistant."*

### `login` — QR code login

Run the login script. It handles the full interactive flow: fetch QR code,
render in terminal, show direct link, poll for scan, save credentials, and
auto-add the scanner to the allowlist.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/login.ts"
```

If `CLAUDE_PLUGIN_ROOT` is not set (e.g. running outside plugin system),
find `login.ts` relative to the skill file or in the project root.

The script will:
1. Fetch a QR code from `https://ilinkai.weixin.qq.com/`
2. Render it in the terminal (via `npx qrcode-terminal`) and show the
   direct link — user can scan OR open the link in WeChat
3. Poll for scan status (wait → scaned → confirmed)
4. Auto-refresh QR up to 3 times if it expires
5. Save credentials to `~/.claude/channels/weixin/credentials.json`
6. Add the scanner's user ID to the allowlist

After the script completes, tell the user to restart Claude Code to activate
the channel.

For a custom API base URL:
```bash
bun "${CLAUDE_PLUGIN_ROOT}/login.ts" --base-url "https://custom.endpoint.com/"
```

### `clear` — remove credentials

Delete `~/.claude/channels/weixin/credentials.json`.

### `baseurl <url>` — set custom API base URL

For testing or alternative iLink endpoints. Read existing credentials.json,
update `baseUrl`, write back.

---

## Implementation notes

- The channels dir might not exist if the server hasn't run yet. Missing file
  = not configured, not an error.
- The server reads credentials.json once at boot. Credential changes need a
  session restart. Say so after saving.
- `access.json` is re-read on every inbound message — policy changes via
  `/weixin:access` take effect immediately, no restart.
- Default API base URL is `https://ilinkai.weixin.qq.com/`.
- The QR code URL is a WeChat mini-program link. It works when scanned with
  WeChat's QR scanner OR when opened in WeChat's built-in browser.
