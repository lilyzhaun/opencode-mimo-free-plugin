import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import plugin, { MimoFree, MimoFreeAuthPlugin, parseJwtExp, wrappedFetch } from "../src/index.js"

describe("MimoFreeAuthPlugin", () => {
  test("exports an OpenCode v1 server plugin", () => {
    expect(plugin).toEqual({
      id: "opencode-mimo-free-plugin",
      server: MimoFreeAuthPlugin,
    })
  })

  test("injects the mimo provider through the config hook", async () => {
    const hooks = await MimoFreeAuthPlugin()
    const config = {}

    await hooks.config?.(config)

    expect(config).toMatchObject({
      provider: {
        mimo: {
          name: "MiMo Auto (free)",
          npm: "@ai-sdk/openai-compatible",
          api: MimoFree.chatBaseUrl,
          options: { apiKey: "anonymous" },
          models: { "mimo-auto": { name: "MiMo Auto", tool_call: true } },
        },
      },
    })
    expect(config).not.toHaveProperty("disabled_providers")
  })

  test("preserves an existing mimo provider", async () => {
    const hooks = await MimoFreeAuthPlugin()
    const config = { provider: { mimo: { name: "existing" } } }

    await hooks.config?.(config)

    expect(config.provider.mimo).toEqual({ name: "existing" })
  })

  test("parses jwt exp from the payload", () => {
    const payload = Buffer.from(JSON.stringify({ exp: 123 })).toString("base64url")

    expect(parseJwtExp(`header.${payload}.signature`)).toBe(123000)
  })

  test("adds MiMo request headers and required system prompt", async () => {
    const originalFetch = globalThis.fetch
    const originalDataDir = process.env.OPENCODE_MIMO_FREE_DATA_DIR
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-mimo-free-plugin-test-"))
    process.env.OPENCODE_MIMO_FREE_DATA_DIR = dataDir
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init })
      if (String(input).endsWith("/bootstrap")) {
        const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")
        return Response.json({ jwt: `header.${payload}.signature` })
      }
      return Response.json({ ok: true })
    }) as typeof fetch

    try {
      await wrappedFetch("https://api.xiaomimimo.com/api/free-ai/openai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "mimo-auto", stream: true, messages: [{ role: "user", content: "hello" }] }),
      })
    } finally {
      globalThis.fetch = originalFetch
      if (originalDataDir === undefined) delete process.env.OPENCODE_MIMO_FREE_DATA_DIR
      else process.env.OPENCODE_MIMO_FREE_DATA_DIR = originalDataDir
      fs.rmSync(dataDir, { recursive: true, force: true })
    }

    const chatCall = calls.find((call) => String(call.input).endsWith("/chat"))
    expect(chatCall).toBeDefined()
    const headers = new Headers(chatCall?.init?.headers)
    expect(headers.get("X-Mimo-Source")).toBe("mimocode-cli-free")
    expect(headers.get("x-session-affinity")).toMatch(/^ses_[a-f0-9]{24}$/)
    const body = JSON.parse(String(chatCall?.init?.body))
    expect(body.messages[0]).toEqual({
      role: "system",
      content: "You are MiMoCode, an interactive CLI tool that helps users with software engineering tasks.",
    })
  })
})
