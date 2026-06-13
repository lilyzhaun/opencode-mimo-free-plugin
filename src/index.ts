import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

type ProviderConfig = {
  name: string
  npm: string
  api: string
  options: {
    apiKey: string
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  }
  models: Record<string, ModelConfig>
}

type ModelConfig = {
  name: string
  attachment: boolean
  reasoning: boolean
  tool_call: boolean
  temperature: boolean
  modalities: { input: string[]; output: string[] }
  limit: { context: number; output: number }
  cost: { input: number; output: number }
}

type OpenCodeConfig = {
  provider?: Record<string, unknown>
}

type Hooks = {
  config?: (input: OpenCodeConfig) => Promise<void>
}

const DEFAULT_BASE_URL = "https://api.xiaomimimo.com/"
const JWT_REFRESH_BUFFER_MS = 5 * 60_000

export const MimoFree = {
  baseUrl: normalizeBaseUrl(process.env.MIMO_FREE_BASE_URL || DEFAULT_BASE_URL),
  get bootstrapUrl() {
    return `${this.baseUrl}/api/free-ai/bootstrap`
  },
  get chatBaseUrl() {
    return `${this.baseUrl}/api/free-ai/openai`
  },
  fingerprint: () => getClientFingerprint(),
  async verify() {
    cached = null
    const result = await bootstrap()
    cached = result
    return { jwt: result.jwt, exp: result.exp, fingerprint: getClientFingerprint() }
  },
}

let fingerprintCache: string | undefined
let cached: { jwt: string; exp: number } | null = null
let inflight: Promise<{ jwt: string; exp: number }> | null = null

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "")
}

function dataDirectory() {
  if (process.env.OPENCODE_MIMO_FREE_DATA_DIR) return process.env.OPENCODE_MIMO_FREE_DATA_DIR
  if (process.env.XDG_DATA_HOME) return path.join(process.env.XDG_DATA_HOME, "opencode-mimo-free-plugin")
  return path.join(os.homedir(), ".local", "share", "opencode-mimo-free-plugin")
}

function readPersistedFingerprint(file: string) {
  try {
    return fs.readFileSync(file, "utf-8").trim() || undefined
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
    console.warn("opencode-mimo-free-plugin: could not read fingerprint", error)
    return undefined
  }
}

function writePersistedFingerprint(file: string, fingerprint: string) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
    fs.writeFileSync(file, fingerprint, { mode: 0o600 })
  } catch (error) {
    console.warn("opencode-mimo-free-plugin: could not persist fingerprint", error)
  }
}

function getClientFingerprint() {
  if (fingerprintCache) return fingerprintCache
  const file = path.join(dataDirectory(), "client-fingerprint")
  const existing = readPersistedFingerprint(file)
  if (existing) {
    fingerprintCache = existing
    return existing
  }

  const fingerprint = crypto
    .createHash("sha256")
    .update([os.hostname(), process.platform, process.arch, os.cpus()[0]?.model ?? "unknown-cpu", username()].join("|"))
    .digest("hex")
  writePersistedFingerprint(file, fingerprint)
  fingerprintCache = fingerprint
  return fingerprint
}

function username() {
  try {
    return os.userInfo().username
  } catch (error) {
    console.warn("opencode-mimo-free-plugin: could not read username", error)
    return "unknown-user"
  }
}

export function parseJwtExp(jwt: string) {
  const parts = jwt.split(".")
  if (parts.length < 2) return Date.now() + 50 * 60_000

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8")) as { exp?: unknown }
    if (typeof payload.exp === "number") return payload.exp * 1000
  } catch (error) {
    console.warn("opencode-mimo-free-plugin: could not parse jwt exp", error)
  }
  return Date.now() + 50 * 60_000
}

async function bootstrap() {
  const response = await fetch(MimoFree.bootstrapUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client: getClientFingerprint(), deviceId: getClientFingerprint() }),
  })
  if (!response.ok) throw new Error(`mimo-free bootstrap failed: ${response.status} ${(await response.text()).slice(0, 200)}`)

  const data = (await response.json()) as { jwt?: unknown }
  if (typeof data.jwt !== "string" || !data.jwt) throw new Error("mimo-free bootstrap response missing jwt")
  return { jwt: data.jwt, exp: parseJwtExp(data.jwt) }
}

async function getJwt() {
  if (cached && cached.exp - Date.now() > JWT_REFRESH_BUFFER_MS) return cached.jwt
  if (inflight) return (await inflight).jwt

  cached = null
  inflight = bootstrap()
  try {
    cached = await inflight
    return cached.jwt
  } finally {
    inflight = null
  }
}

function buildHeaders(init: RequestInit | undefined, jwt: string) {
  const headers = new Headers(init?.headers)
  headers.set("Authorization", `Bearer ${jwt}`)
  headers.set("X-Mimo-Source", "mimocode-cli-free")
  return headers
}

export async function wrappedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" || input instanceof URL ? String(input) : input.url
  const rewritten = url.replace(/\/chat\/completions(\?|$)/, "/chat$1")
  const response = await fetch(rewritten, { ...init, headers: buildHeaders(init, await getJwt()) })
  if (response.status !== 401 && response.status !== 403) return response

  cached = null
  return fetch(rewritten, { ...init, headers: buildHeaders(init, await getJwt()) })
}

export async function MimoFreeAuthPlugin(): Promise<Hooks> {
  return {
    config: async (input) => {
      input.provider ??= {}
      const mimoProvider: ProviderConfig = {
        name: "MiMo Auto (free)",
        npm: "@ai-sdk/openai-compatible",
        api: MimoFree.chatBaseUrl,
        options: {
          apiKey: "anonymous",
          fetch: wrappedFetch,
        },
        models: {
          "mimo-auto": {
            name: "MiMo Auto",
            attachment: true,
            reasoning: true,
            tool_call: true,
            temperature: true,
            modalities: { input: ["text", "image"], output: ["text"] },
            limit: { context: 1_000_000, output: 128_000 },
            cost: { input: 0, output: 0 },
          },
        },
      }

      input.provider.mimo ??= mimoProvider
    },
  }
}

export default {
  id: "opencode-mimo-free-plugin",
  server: MimoFreeAuthPlugin,
}
