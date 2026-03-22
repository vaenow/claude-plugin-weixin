#!/usr/bin/env bun
/**
 * Interactive WeChat iLink Bot QR login script.
 * Usage: bun login.ts [--base-url URL]
 *
 * 1. Fetches QR code from iLink API
 * 2. Renders QR in terminal + shows direct link
 * 3. Polls for scan status
 * 4. Saves credentials + auto-adds scanner to allowlist
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const STATE_DIR = join(homedir(), '.claude', 'channels', 'weixin')
const CREDENTIALS_FILE = join(STATE_DIR, 'credentials.json')
const ACCESS_FILE = join(STATE_DIR, 'access.json')

const DEFAULT_BASE_URL = 'https://ilinkai.weixin.qq.com/'
const POLL_INTERVAL_MS = 3000
const TIMEOUT_MS = 5 * 60_000
const MAX_QR_REFRESHES = 3

// Parse args
let baseUrl = DEFAULT_BASE_URL
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--base-url' && process.argv[i + 1]) {
    baseUrl = process.argv[++i]
  }
}
if (!baseUrl.endsWith('/')) baseUrl += '/'

// --- QR rendering ---

// Minimal QR code rendering using Unicode block characters.
// Falls back to just showing the URL if qrcode-terminal isn't available.
async function renderQR(url: string): Promise<void> {
  try {
    // Try qrcode-terminal (commonly available via npx)
    const proc = Bun.spawn(['npx', '-y', 'qrcode-terminal@0.12.0', url, '--small'], {
      stdout: 'inherit',
      stderr: 'pipe',
    })
    await proc.exited
    if (proc.exitCode === 0) return
  } catch {}

  // Fallback: just print the URL
  console.log(`(QR code rendering unavailable — use the link below)`)
}

// --- API calls ---

async function fetchQRCode(): Promise<{ qrcode: string; url: string }> {
  const res = await fetch(`${baseUrl}ilink/bot/get_bot_qrcode?bot_type=3`)
  if (!res.ok) throw new Error(`get_bot_qrcode failed: ${res.status}`)
  const data = await res.json() as any
  return { qrcode: data.qrcode, url: data.qrcode_img_content }
}

async function pollStatus(qrcode: string): Promise<any> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 35000)
  try {
    const res = await fetch(
      `${baseUrl}ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`,
      { signal: controller.signal },
    )
    clearTimeout(timer)
    if (!res.ok) throw new Error(`get_qrcode_status failed: ${res.status}`)
    return await res.json()
  } catch (err: any) {
    clearTimeout(timer)
    if (err?.name === 'AbortError') return { status: 'wait' }
    throw err
  }
}

// --- Credential / access persistence ---

function saveCredentials(data: {
  token: string
  baseUrl: string
  accountId: string
  userId: string
}): void {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
  const tmp = CREDENTIALS_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 })
  const { renameSync } = require('fs')
  renameSync(tmp, CREDENTIALS_FILE)
}

function addToAllowlist(userId: string): void {
  let access: any
  try {
    access = JSON.parse(readFileSync(ACCESS_FILE, 'utf8'))
  } catch {
    access = { dmPolicy: 'pairing', allowFrom: [], pending: {} }
  }
  if (!access.allowFrom) access.allowFrom = []
  if (!access.allowFrom.includes(userId)) {
    access.allowFrom.push(userId)
  }
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
  const tmp = ACCESS_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(access, null, 2) + '\n', { mode: 0o600 })
  const { renameSync } = require('fs')
  renameSync(tmp, ACCESS_FILE)
}

// --- Main flow ---

async function main(): Promise<void> {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })

  let refreshCount = 0

  while (refreshCount < MAX_QR_REFRESHES) {
    refreshCount++

    console.log(refreshCount > 1 ? '\n🔄 正在刷新二维码...' : '正在获取登录二维码...')
    const { qrcode, url } = await fetchQRCode()

    console.log('')
    await renderQR(url)
    console.log(`\n用微信扫描上方二维码，或在微信中打开以下链接：`)
    console.log(`\n  ${url}\n`)

    // Poll loop
    const deadline = Date.now() + TIMEOUT_MS
    let scannedShown = false

    while (Date.now() < deadline) {
      const resp = await pollStatus(qrcode)

      switch (resp.status) {
        case 'wait':
          process.stdout.write('.')
          break

        case 'scaned':
          if (!scannedShown) {
            console.log('\n👀 已扫码，请在微信上点击确认...')
            scannedShown = true
          }
          break

        case 'expired':
          console.log('\n⏳ 二维码已过期')
          break

        case 'confirmed': {
          console.log('\n✅ 微信连接成功！\n')

          const creds = {
            token: resp.bot_token,
            baseUrl: resp.baseurl ?? baseUrl,
            accountId: resp.ilink_bot_id,
            userId: resp.ilink_user_id,
          }

          saveCredentials(creds)
          console.log(`凭证已保存到 ${CREDENTIALS_FILE}`)
          console.log(`  accountId: ${creds.accountId}`)
          console.log(`  userId:    ${creds.userId}`)

          if (creds.userId) {
            addToAllowlist(creds.userId)
            console.log(`\n已将你的 userId 添加到白名单`)
          }

          console.log(`\n重启 Claude Code 会话以启用微信频道`)
          return
        }
      }

      if (resp.status === 'expired') break

      await Bun.sleep(POLL_INTERVAL_MS)
    }
  }

  console.error('\n登录超时：二维码多次过期，请重新运行 /weixin:configure login')
  process.exit(1)
}

main().catch(err => {
  console.error(`登录失败: ${err}`)
  process.exit(1)
})
