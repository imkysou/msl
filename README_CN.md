# MinecraftServerListener

[English](./README.md) | 中文

一个基于 Node.js 的 Minecraft 服务器管理工具，支持插件系统、HTTP API 和 QQ 机器人消息推送。

## 功能特性

- 🎮 **服务器管理** - 启动、监控、自动重启 Minecraft 服务器
- 🔌 **插件系统** - 支持自定义插件扩展功能，支持单插件管理
- 🌐 **HTTP API** - 提供 RESTful API 接口远程控制服务器
- 🤖 **QQ 机器人** - 支持 OneBot11 协议，可发送消息到 QQ 群
- 📝 **日志解析** - 自动解析玩家加入、退出、消息、指令等事件
- 🔄 **热加载** - 支持运行时重载插件

## 快速开始

### 安装

```bash
git clone https://github.com/imkysou/msl.git
cd msl
npm install
```

### 配置

复制 `config.example.js` 为 `config.js` 并修改配置：

```bash
copy config.example.js config.js
```

编辑 `config.js` 文件，配置你的服务器信息：

```javascript
module.exports = {
    debug: true,
    api: {
        port: 30600,
        token: "your-api-token"
    },
    minecraft: {
        args: ["java", "-jar", "server.jar"],
        cwd: "./server",
        // ...
    },
    qqbot: {
        server: "http://127.0.0.1:3000",
        token: "your-qqbot-token",
        groupIds: [123456789]
    }
}
```

### 运行

```bash
node index.js
```

## 控制台指令

在 Node.js 控制台中输入以下指令：

| 指令 | 说明 |
|------|------|
| `msl` | 显示帮助信息 |
| `msl help` | 显示帮助信息 |
| `msl version` | 显示 MSL 版本 |
| `msl reload` | 重载所有插件 |
| `msl stopmc` | 停止 Minecraft 服务器 |
| `msl startmc` | 启动 Minecraft 服务器 |
| `msl disable_plugin all` | 卸载所有插件 |
| `msl disable_plugin <name>` | 卸载指定插件 |
| `msl enable_plugin all` | 加载所有插件 |
| `msl enable_plugin <name>` | 加载指定插件 |
| `msl list_plugins` | 列出所有插件及状态 |
| `msl debug on` | 开启调试信息 |
| `msl debug off` | 关闭调试信息 |
| `msl debug` | 查看当前调试状态 |
| `msl disable_http` | 禁用 HTTP 服务 |
| `msl enable_http` | 启用 HTTP 服务 |

## HTTP API

### 执行指令

```http
POST /execCommand
Content-Type: application/json

{
    "token": "your-api-token",
    "command": "list"
}
```

## 插件开发

在 `plugins` 目录下创建 `.js` 文件即可开发插件。插件在程序启动时自动加载。

### 可用接口

| 接口 | 说明 |
|------|------|
| `plugin_require(moduleName)` | 导入 Node.js 模块 |
| `plugin_executeCommand(command, fn?)` | 执行 MC 指令（可选回调获取响应） |
| `plugin_registerCommand(expr, fn)` | 注册自定义指令 |
| `plugin_onEvent(event, fn)` | 监听事件 |
| `plugin_triggerEvent(event, ...args)` | 触发事件 |
| `plugin_sendQQMessage(text)` | 发送 QQ 群消息 |
| `plugin_log(type, message)` | 输出日志 (INFO/WARN/ERROR) |
| `plugin_generateOfflineUUID(name)` | 生成离线 UUID |
| `plugin_registerApi(method, path, fn)` | 注册 HTTP 接口 |
| `plugin_push(key, value)` | 存储全局数据 |
| `plugin_pull(key)` | 获取全局数据 |
| `plugin_getPluginsList()` | 获取插件列表 `{loaded, unloaded, all}` |

### 原生事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `serverLog` | line | 服务器输出的每一行日志 |
| `serverDone` | (无) | 服务器启动完成 |
| `playerJoin` | time, player | 玩家加入服务器 |
| `playerQuit` | time, player | 玩家退出服务器 |
| `playerSendMessage` | time, player, message | 玩家发送消息 |
| `playerSendCommand` | time, player, command, args | 玩家执行指令 |

### 示例插件

```javascript
plugin_onEvent("serverDone", () => {
    plugin_log("INFO", "Server started!");
});

plugin_onEvent("playerJoin", (time, player) => {
    plugin_log("INFO", `Player ${player} joined`);
});

plugin_onEvent("serverLog", (line) => {
    if (line.includes("WARN")) {
        plugin_log("WARN", `Warning detected: ${line}`);
    }
});

plugin_registerCommand("!ping", (player) => {
    plugin_executeCommand(`say ${player} requested ping`);
});

plugin_registerApi("GET", "/api/hello", (req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Hello!" }));
});
```

## 项目结构

```
MinecraftServerListener/
├── index.js            # 主程序入口
├── config.js           # 配置文件（需自行创建）
├── config.example.js   # 配置示例文件
├── .msl/
│   ├── pluginsLibs.js  # 插件接口库
│   ├── pluginsLoader.js# 插件加载器
│   └── MSL_VERSION     # 版本文件
├── plugins/            # 插件目录
│   └── demo.js         # 示例插件
├── CLAUDE.md           # AI 辅助开发文档
└── package.json
```

## 许可证

MIT License
