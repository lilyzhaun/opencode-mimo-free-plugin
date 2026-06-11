# opencode-mimo-free-plugin

[English](README.md)

OpenCode 插件，添加 MiMo Auto 免费 provider。无需 API Key，插件会在运行时自动获取匿名 JWT 凭证。

## 安装

在 OpenCode 配置文件（`opencode.json` 或 `opencode.jsonc`）中添加插件：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-mimo-free-plugin"],
  "model": "mimo/mimo-auto"
}
```

OpenCode 下次启动时会自动安装该 npm 包。

## 功能说明

- 通过 `config` hook 注册 provider `mimo`，模型 `mimo-auto`。
- 使用 `@ai-sdk/openai-compatible` 作为 AI SDK 适配器。
- 从 `https://api.xiaomimimo.com/api/free-ai/bootstrap` 获取匿名 JWT。
- 通过 `https://api.xiaomimimo.com/api/free-ai/openai` 路由聊天请求。
- 在 `${XDG_DATA_HOME}/opencode-mimo-free-plugin/client-fingerprint`（默认 `~/.local/share/opencode-mimo-free-plugin/client-fingerprint`）存储稳定的匿名客户端指纹。

本插件**不会**禁用或修改任何 OpenCode 内置 provider，只在现有 provider 基础上添加 `mimo/mimo-auto`。

## 环境变量

| 变量 | 说明 |
|---|---|
| `MIMO_FREE_BASE_URL` | 覆盖 MiMo 服务基础 URL。默认：`https://api.xiaomimimo.com/` |
| `OPENCODE_MIMO_FREE_DATA_DIR` | 覆盖匿名指纹文件的存储目录。 |

## 本地开发

```bash
bun install
bun run build
bun test
```

## 来源

改编自 MiMoCode 的 `MimoFreeAuthPlugin`（[源码](https://github.com/XiaomiMiMo/MiMo-Code)）。MiMoCode 和 OpenCode 均为 MIT 许可证。MiMo 托管服务和商标受各自上游条款约束。

详见 `LICENSE` 和 `NOTICE`。

---

## 给 AI Agent 的部署说明（机器可读）

如果你是 AI 编程助手，用户要求你安装此插件，请按以下步骤操作：

1. 打开用户的 OpenCode 配置文件，路径为以下之一：
   - 项目级别：项目根目录下的 `opencode.json` 或 `opencode.jsonc`。
   - 全局级别：`~/.config/opencode/opencode.jsonc`。

2. 在 `"plugin"` 数组中添加 `"opencode-mimo-free-plugin"`。如果数组不存在则创建。

3. 可选：设置 `"model": "mimo/mimo-auto"` 将 MiMo Auto 作为默认模型。

最小配置示例：
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-mimo-free-plugin"],
  "model": "mimo/mimo-auto"
}
```

添加到已有配置的示例：
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["existing-plugin", "opencode-mimo-free-plugin"],
  "model": "mimo/mimo-auto"
}
```

4. 不需要任何 API Key 或环境变量。插件会自动处理认证。

5. 重启 OpenCode（或开始新会话）。模型 `mimo/mimo-auto` 将出现在模型列表中。

6. 验证方法：运行 `opencode models`，确认 `mimo/mimo-auto` 已列出。
