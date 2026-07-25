# OpenClaw 部署与配置完全指南

OpenClaw 是一个强大的 AI 助手框架，支持多平台部署。本文详细介绍如何在 Windows 上部署 OpenClaw、卸载重装、配置 Discord 频道以及配置模型。

## 系统要求

| 项目 | 要求 |
|------|------|
| **Node.js** | 22+ |
| **操作系统** | macOS、Linux 或 Windows |
| **推荐（Windows）** | WSL2 |
| **包管理器** | npm / pnpm |

> 💡 建议在 Windows 上使用 WSL2 以获得更好的兼容性。

## 一、安装 OpenClaw

OpenClaw 提供两种安装方式，推荐使用安装脚本。

### 方式一：安装脚本（推荐）

一键安装，自动处理依赖和环境配置：

```bash
curl -fsSL https://openclaw.ai/install.sh | sh
```

安装完成后，执行初始化：

```bash
openclaw onboard --install-daemon
```

**优点：** 自动配置环境变量、注册系统服务、无需手动处理依赖。

### 方式二：npm / pnpm

如果你已安装 Node.js 22+，也可以直接通过 npm 安装：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

或者使用 pnpm：

```bash
pnpm add -g openclaw@latest
openclaw onboard --install-daemon
```

### 验证安装

安装完成后，运行以下命令确认：

```bash
openclaw status
```

如果显示运行中状态，说明安装成功。

## 二、卸载 OpenClaw

### 方式一：使用卸载命令（推荐）

如果 CLI 仍然可用，一键卸载：

```bash
openclaw uninstall --all --yes --non-interactive
```

或者分步执行，更清晰地了解卸载过程：

```bash
# 1. 停止网关服务
openclaw gateway stop

# 2. 卸载网关服务
openclaw gateway uninstall

# 3. 删除状态和配置
rm -rf "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"

# 4. 删除 CLI
npm rm -g openclaw
```

### 方式二：手动卸载（CLI 已删除）

如果已经无法使用 `openclaw` 命令，需要手动清理残留文件和服务。

#### Windows

```powershell
schtasks /Delete /F /TN "OpenClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.cmd"
```

#### macOS / Linux

```bash
# 检查并杀掉相关进程
pkill -f openclaw-gateway

# 删除配置目录
rm -rf ~/.openclaw

# 删除全局 CLI
npm rm -g openclaw
```

## 三、配置 Discord 频道

OpenClaw 支持通过 Discord Bot 作为交互入口。

### 步骤 1：创建 Discord Bot

1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 点击 **New Application**，输入应用名称
3. 进入 **Bot** 页面，点击 **Add Bot**
4. 在 **Privileged Gateway Intents** 下启用以下 intents：
   - **Message Content Intent**（必需，用于读取消息）
   - **Server Members Intent**（推荐，用于识别用户身份）

### 步骤 2：配置 Token

将 Bot Token 填入配置文件 `~/.openclaw/openclaw.json`：

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "YOUR_BOT_TOKEN",
    },
  },
}
```

或者通过环境变量配置（推荐，避免 Token 明文写入文件）：

```bash
export DISCORD_BOT_TOKEN=your_token_here
```

### 步骤 3：邀请 Bot 并启动网关

1. 在 Discord Developer Portal 进入 **OAuth2 → URL Generator**
2. 选择 scopes：`bot`、`applications.commands`
3. 选择权限：`Send Messages`、`Read Message History`
4. 使用生成的 URL 邀请 Bot 到你的服务器
5. 启动 OpenClaw 网关：

```bash
openclaw gateway
```

### 步骤 4：配对第一个 DM

启动网关后，向 Bot 发送私信，然后在终端中完成配对：

```bash
# 查看待处理的配对请求
openclaw pairing list discord

# 批准配对
openclaw pairing approve discord <CODE>
```

> ⏰ 配对码有效期为 **1 小时**，超时需要重新生成。

## 四、配置模型

OpenClaw 支持多种模型提供商，可以根据需求灵活切换。

### MiniMax（默认）

首次运行 `openclaw onboard` 时会自动引导配置 MiniMax 模型。按照提示输入 API Key 即可。

### Ollama（本地模型）

如果希望使用本地模型，推荐配置 Ollama。

**1. 启动 Ollama 服务**

确保 Ollama 已安装并正在运行：

```bash
ollama serve
```

**2. 拉取并查看可用模型**

```bash
# 拉取模型
ollama pull qwen3:8b

# 查看本地已有模型
curl -s http://localhost:11434/api/tags
```

**3. 在 OpenClaw 配置文件中添加 Ollama 提供商**

编辑 `~/.openclaw/openclaw.json`：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://localhost:11434",
        api: "ollama",
        models: [
          {
            id: "qwen3:8b",
            name: "Qwen3 8B",
            reasoning: false,
            contextWindow: 32768,
            maxTokens: 4096,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      models: {
        "ollama/qwen3:8b": {
          alias: "qwen3",
        },
      },
    },
  },
}
```

### 配置默认模型

设置全局默认使用的模型：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "minimax-portal/MiniMax-M2.5",
      },
    },
  },
}
```

### 使用别名快速切换模型

配置完成后，在对话中可以直接通过别名切换模型：

- `/model qwen3` — 切换到本地 Qwen3 8B
- `/model minimax-m2.5` — 切换到 MiniMax M2.5

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `openclaw gateway start` | 启动网关 |
| `openclaw gateway stop` | 停止网关 |
| `openclaw gateway restart` | 重启网关 |
| `openclaw gateway status` | 查看网关状态 |
| `openclaw gateway logs` | 查看网关日志 |
| `openclaw config get` | 查看当前配置 |
| `openclaw config patch` | 修改配置 |
| `openclaw config reset` | 重置配置 |
| `openclaw pairing list` | 查看配对列表 |
| `openclaw pairing approve <CODE>` | 批准配对 |
| `openclaw status` | 查看整体运行状态 |
| `openclaw update` | 检查并更新到最新版本 |

## 常见问题排查

### 网关启动失败

**症状：** 运行 `openclaw gateway` 后立即退出或报错

**解决方案：**
1. 检查 Node.js 版本是否符合要求（22+）
2. 查看日志定位错误：`openclaw gateway logs`
3. 检查端口是否被占用（默认端口 8200）

### Discord Bot 无响应

**症状：** Bot 在线但不回复消息

**解决方案：**
1. 确认 **Message Content Intent** 已启用
2. 检查 Bot Token 是否正确配置
3. 重新启动网关服务

### 模型切换失败

**症状：** `/model` 命令提示模型不存在

**解决方案：**
1. 检查配置文件中模型 ID 是否拼写正确
2. 确认对应的模型提供商配置完整
3. 重启网关使配置生效

## 总结

本文介绍了 OpenClaw 的完整部署流程：

| 步骤 | 状态 |
|------|------|
| ✅ 安装 OpenClaw | 安装脚本 / npm 两种方式 |
| ✅ 卸载 OpenClaw | 自动卸载 / 手动清理 |
| ✅ 配置 Discord | Bot 创建 → Token 配置 → 配对 |
| ✅ 配置模型 | MiniMax / Ollama 本地模型 |
| ✅ 常用命令 | 网关管理、配置、配对速查 |

希望这篇指南对你有所帮助！

---

*本文由小陈编写 | 最后更新：2026 年 7 月*
