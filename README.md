# claude-channel-weixin

WeChat (微信) channel plugin for [Claude Code](https://claude.com/claude-code) — receive and reply to WeChat messages directly in your terminal.

Uses the WeChat iLink Bot API with HTTP long-poll. No public webhook needed.

> **Based on [m1heng/claude-plugin-weixin](https://github.com/m1heng/claude-plugin-weixin)** — thanks to [@m1heng](https://github.com/m1heng) for the original implementation.

## ✨ What's new in this fork

### 🔀 Multi-instance support

Run multiple Claude Code sessions, each connected to a **different** WeChat bot account. 🚫 No more duplicate replies.

Set `WEIXIN_INSTANCE` environment variable before starting Claude Code:

```bash
# Session 1 — default instance (backward compatible)
claude

# Session 2 — separate instance with its own WeChat bot
WEIXIN_INSTANCE=work claude
```

Each instance has 🔒 isolated credentials, access control, and long-poll state under `~/.claude/channels/weixin/<instance>/`.

## Prerequisites

- [Claude Code](https://claude.com/claude-code) v2.1.80+
- [Bun](https://bun.sh) runtime

## Install

```bash
# Add the marketplace (one-time)
claude plugin marketplace add vaenow/claude-plugin-weixin

# Install the plugin
claude plugin install weixin@vaenow-plugins
```

## Configure

### Login with QR code

In Claude Code, run:

```
/weixin:configure login
```

This will fetch a QR code from the WeChat iLink Bot API. Scan it with WeChat and confirm on your phone. Credentials are saved automatically.

### Start with channels

```bash
claude --dangerously-load-development-channels plugin:weixin@vaenow-plugins
```

> The `--dangerously-load-development-channels` flag is required during the [channels research preview](https://code.claude.com/docs/en/channels-reference#test-during-the-research-preview) for non-official plugins.

### Pair your WeChat account

1. Send a message to the bot on WeChat — it replies with a pairing code
2. In Claude Code, run `/weixin:access pair <code>` to approve

### 🔀 Multi-instance setup

To run a second instance:

```bash
# Start Claude Code with a named instance
WEIXIN_INSTANCE=work claude --dangerously-load-development-channels plugin:weixin@vaenow-plugins

# Login with a different WeChat QR code
/weixin:configure login
```

Each instance stores its state independently:
- Default: `~/.claude/channels/weixin/`
- Named: `~/.claude/channels/weixin/<instance>/`

## Skills

| Skill | Description |
|---|---|
| `/weixin:configure` | QR code login, check channel status |
| `/weixin:access` | Manage pairing, allowlists, DM policy |

## How it works

The plugin runs a local MCP server that long-polls the WeChat iLink Bot API for new messages. No public URL or webhook needed — everything runs locally. Messages from allowed senders are forwarded to your Claude Code session; Claude replies back through the same API.

### Key difference from Telegram/Feishu

WeChat requires a `context_token` to be passed back when replying. This token comes from the inbound message and is automatically included in the channel notification metadata. Claude passes it back through the reply tool.

## Credits

- Original plugin: [m1heng/claude-plugin-weixin](https://github.com/m1heng/claude-plugin-weixin) by [@m1heng](https://github.com/m1heng)

## License

MIT

---

# claude-channel-weixin（中文文档）

微信频道插件，用于 [Claude Code](https://claude.com/claude-code) — 在终端中直接收发微信消息。

基于微信 iLink Bot API，HTTP 长轮询方式，无需公网地址或 Webhook。

> **基于 [m1heng/claude-plugin-weixin](https://github.com/m1heng/claude-plugin-weixin)** — 感谢 [@m1heng](https://github.com/m1heng) 的原始实现。

## ✨ 本 Fork 的新特性

### 🔀 多实例支持

同时运行多个 Claude Code 会话，每个会话连接**不同的**微信 Bot 账号，互不干扰，🚫 不再重复回复。

启动 Claude Code 前设置 `WEIXIN_INSTANCE` 环境变量即可：

```bash
# 会话 1 — 默认实例（向后兼容，无需设置）
claude

# 会话 2 — 独立实例，连接另一个微信 Bot
WEIXIN_INSTANCE=work claude
```

每个实例的凭据、访问控制和轮询状态 🔒 完全隔离，存储在 `~/.claude/channels/weixin/<实例名>/` 下。

## 前置要求

- [Claude Code](https://claude.com/claude-code) v2.1.80+
- [Bun](https://bun.sh) 运行时

## 安装

```bash
# 添加插件市场（首次）
claude plugin marketplace add vaenow/claude-plugin-weixin

# 安装插件
claude plugin install weixin@vaenow-plugins
```

## 配置

### 扫码登录

在 Claude Code 中运行：

```
/weixin:configure login
```

插件会从微信 iLink Bot API 获取二维码，用微信扫码并在手机上确认即可。凭据自动保存。

### 启动频道

```bash
claude --dangerously-load-development-channels plugin:weixin@vaenow-plugins
```

> 非官方插件在 [channels 预览期](https://code.claude.com/docs/en/channels-reference#test-during-the-research-preview) 需要 `--dangerously-load-development-channels` 参数。

### 配对微信账号

1. 在微信中给 Bot 发一条消息 — Bot 会回复一个配对码
2. 在 Claude Code 中运行 `/weixin:access pair <配对码>` 完成授权

### 🔀 多实例配置

开启第二个实例：

```bash
# 带实例名启动 Claude Code
WEIXIN_INSTANCE=work claude --dangerously-load-development-channels plugin:weixin@vaenow-plugins

# 扫另一个微信二维码登录
/weixin:configure login
```

各实例的状态目录互相独立：
- 默认实例：`~/.claude/channels/weixin/`
- 命名实例：`~/.claude/channels/weixin/<实例名>/`

## 技能命令

| 命令 | 说明 |
|---|---|
| `/weixin:configure` | 扫码登录、查看频道状态 |
| `/weixin:access` | 管理配对、白名单、消息策略 |

## 工作原理

插件运行一个本地 MCP Server，通过 HTTP 长轮询从微信 iLink Bot API 拉取新消息。完全本地运行，无需公网地址。已授权的发送者的消息会转发到你的 Claude Code 会话，Claude 通过同一 API 回复。

### 与 Telegram/飞书的区别

微信回复时必须携带 `context_token`（来自收到的消息）。插件会自动将此 token 包含在频道通知的元数据中，Claude 回复时自动传回。

## 致谢

- 原始插件：[m1heng/claude-plugin-weixin](https://github.com/m1heng/claude-plugin-weixin)，作者 [@m1heng](https://github.com/m1heng)

## 许可证

MIT
