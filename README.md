# opencode-mimo-free-plugin

[中文文档](README.zh-CN.md)

OpenCode plugin that adds the MiMo Auto free provider. Zero API key required -- the plugin bootstraps anonymous JWT credentials at runtime.

## Install

Add the plugin to your OpenCode config (`opencode.json` or `opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-mimo-free-plugin"],
  "model": "mimo/mimo-auto"
}
```

OpenCode will install the npm package automatically on next launch.

## What it does

- Registers provider `mimo` with model `mimo-auto` via the `config` hook.
- Uses `@ai-sdk/openai-compatible` as the AI SDK adapter.
- Bootstraps an anonymous JWT from `https://api.xiaomimimo.com/api/free-ai/bootstrap`.
- Routes chat requests through `https://api.xiaomimimo.com/api/free-ai/openai`.
- Stores a stable anonymous client fingerprint under `${XDG_DATA_HOME}/opencode-mimo-free-plugin/client-fingerprint` (defaults to `~/.local/share/opencode-mimo-free-plugin/client-fingerprint`).

The plugin does **not** disable or modify any built-in OpenCode providers. It only adds `mimo/mimo-auto` alongside your existing providers.

## Environment variables

| Variable | Description |
|---|---|
| `MIMO_FREE_BASE_URL` | Override the MiMo service base URL. Default: `https://api.xiaomimimo.com/` |
| `OPENCODE_MIMO_FREE_DATA_DIR` | Override the directory for storing the anonymous fingerprint file. |

## Local development

```bash
bun install
bun run build
bun test
```

## Provenance

Adapted from MiMoCode's `MimoFreeAuthPlugin` ([source](https://github.com/XiaomiMiMo/MiMo-Code)). Both MiMoCode and OpenCode are MIT-licensed. MiMo-hosted services and trademarks are governed by their respective upstream terms.

See `LICENSE` and `NOTICE` for attribution.

---

## For AI agents (machine-readable deployment instructions)

If you are an AI coding agent and the user asks you to install this plugin, follow these steps exactly:

1. Open the user's OpenCode config file. It is at one of these paths:
   - Project-level: `opencode.json` or `opencode.jsonc` in the project root.
   - Global: `~/.config/opencode/opencode.jsonc`.

2. Add `"opencode-mimo-free-plugin"` to the `"plugin"` array. Create the array if it does not exist.

3. Optionally set `"model": "mimo/mimo-auto"` to use MiMo Auto as the default model.

Example minimal config:
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-mimo-free-plugin"],
  "model": "mimo/mimo-auto"
}
```

Example adding to an existing config:
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["existing-plugin", "opencode-mimo-free-plugin"],
  "model": "mimo/mimo-auto"
}
```

4. No API key or environment variable is required. The plugin handles authentication automatically.

5. Restart OpenCode (or start a new session). The model `mimo/mimo-auto` will appear in the model list.

6. To verify: run `opencode models` and confirm `mimo/mimo-auto` is listed.
