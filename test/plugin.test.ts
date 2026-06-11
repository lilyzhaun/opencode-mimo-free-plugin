import { describe, expect, test } from "bun:test"
import plugin, { MimoFree, MimoFreeAuthPlugin, parseJwtExp } from "../src/index.js"

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
})
