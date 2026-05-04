# MinecraftServerListener

一个基于 Node.js 的 Minecraft 服务器管理工具，支持插件系统、HTTP API 和 QQ 机器人消息推送。

## 功能特性

- 🎮 **服务器管理** - 启动、监控、自动重启 Minecraft 服务器
- 🔌 **插件系统** - 支持自定义插件扩展功能
- 🌐 **HTTP API** - 提供 RESTful API 接口远程控制服务器
- 🤖 **QQ 机器人** - 支持 OneBot11 协议，可发送消息到 QQ 群
- 📝 **日志解析** - 自动解析玩家加入、退出、消息、指令等事件
- 🔄 **热加载** - 支持运行时重载插件

## 快速开始

### 安装

```bash
git clone https://github.com/your-username/MinecraftServerListener.git
cd MinecraftServerListener
```

### 配置

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
| `msl reload` | 重载所有插件 |
| `msl disable_plugins` | 禁用所有插件 |
| `msl enable_plugins` | 启用所有插件 |
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

在 `plugins` 目录下创建 `.js` 文件即可开发插件。

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

### 原生事件

| 事件 | 参数 |
|------|------|
| `playerJoin` | time, player |
| `playerQuit` | time, player |
| `playerSendMessage` | time, player, message |
| `playerSendCommand` | time, player, command, args |

### 示例插件

```javascript
plugin_onEvent("playerJoin", (time, player) => {
    plugin_log("INFO", `玩家 ${player} 加入了服务器`);
});

plugin_registerCommand("!ping", (player) => {
    plugin_executeCommand(`say ${player} 请求了ping`);
});

plugin_registerApi("GET", "/api/hello", (req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Hello!" }));
});
```

## 项目结构

```
MinecraftServerListener/
├── index.js          # 主程序入口
├── config.js         # 配置文件
├── pluginsLoader.js  # 插件加载器
├── pluginsLibs.js    # 插件接口库
├── plugins/          # 插件目录
│   └── demo.js       # 示例插件
└── package.json
```

## 许可证

MIT License
