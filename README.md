# MinecraftServerListener

English | [中文](./README_CN.md)

A Node.js-based Minecraft server management tool with plugin system, HTTP API, and QQ bot integration.

## Features

- 🎮 **Server Management** - Start, monitor, and auto-restart Minecraft server
- 🔌 **Plugin System** - Custom plugin extensions with single-plugin management
- 🌐 **HTTP API** - RESTful API for remote server control
- 🤖 **QQ Bot** - OneBot11 protocol support for QQ group messaging
- 📝 **Log Parsing** - Auto-parse player join, quit, message, and command events
- 🔄 **Hot Reload** - Runtime plugin reloading

## Quick Start

### Installation

```bash
git clone https://github.com/imkysou/msl.git
cd msl
npm install
```

### Configuration

Copy `config.example.js` to `config.js` and modify:

```bash
cp config.example.js config.js
```

Edit `config.js` with your server settings:

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

### Run

```bash
node index.js
```

## Console Commands

Type the following commands in the Node.js console:

| Command | Description |
|---------|-------------|
| `msl` | Show help message |
| `msl help` | Show help message |
| `msl version` | Show MSL version |
| `msl reload` | Reload all plugins |
| `msl stopmc` | Stop Minecraft server |
| `msl startmc` | Start Minecraft server |
| `msl disable_plugin all` | Unload all plugins |
| `msl disable_plugin <name>` | Unload specified plugin |
| `msl enable_plugin all` | Load all plugins |
| `msl enable_plugin <name>` | Load specified plugin |
| `msl list_plugins` | List all plugins with status |
| `msl debug on` | Enable debug mode |
| `msl debug off` | Disable debug mode |
| `msl debug` | Show current debug status |
| `msl disable_http` | Disable HTTP service |
| `msl enable_http` | Enable HTTP service |

## HTTP API

### Execute Command

```http
POST /execCommand
Content-Type: application/json

{
    "token": "your-api-token",
    "command": "list"
}
```

## Plugin Development

Create a `.js` file in the `plugins` directory. Plugins are auto-loaded on startup.

### Available APIs

| API | Description |
|-----|-------------|
| `plugin_require(moduleName)` | Import Node.js module |
| `plugin_executeCommand(command, fn?)` | Execute MC command (optional callback for response) |
| `plugin_registerCommand(expr, fn)` | Register custom command |
| `plugin_onEvent(event, fn)` | Listen to event |
| `plugin_triggerEvent(event, ...args)` | Trigger custom event |
| `plugin_sendQQMessage(text)` | Send QQ group message |
| `plugin_log(type, message)` | Log output (INFO/WARN/ERROR) |
| `plugin_generateOfflineUUID(name)` | Generate offline UUID |
| `plugin_registerApi(method, path, fn)` | Register HTTP endpoint |
| `plugin_push(key, value)` | Store global data |
| `plugin_pull(key)` | Retrieve global data |
| `plugin_getPluginsList()` | Get plugin lists `{loaded, unloaded, all}` |

### Native Events

| Event | Parameters | Description |
|-------|-----------|-------------|
| `serverLog` | line | Every server log line |
| `serverDone` | (none) | Server startup complete |
| `playerJoin` | time, player | Player joined |
| `playerQuit` | time, player | Player left |
| `playerSendMessage` | time, player, message | Player sent chat message |
| `playerSendCommand` | time, player, command, args | Player executed command |

### Example Plugin

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

## Project Structure

```
MinecraftServerListener/
├── index.js            # Main entry point
├── config.js           # Configuration (create yourself)
├── config.example.js   # Configuration template
├── .msl/
│   ├── pluginsLibs.js  # Plugin API library
│   ├── pluginsLoader.js# Plugin loader
│   └── MSL_VERSION     # Version file
├── plugins/            # Plugin directory
│   └── demo.js         # Example plugin
├── CLAUDE.md           # AI development docs
└── package.json
```

## License

MIT License
