# MSL (MinecraftServerListener) - Project Rules

## Project Overview

MSL is a Node.js-based Minecraft server management tool with plugin system and HTTP API.

## Architecture

```
MinecraftServerListener/
├── index.js            # Main entry: server management, HTTP server, msl commands
├── config.js           # User configuration (gitignored)
├── config.example.js   # Configuration template
├── .msl/
│   ├── pluginsLibs.js  # Plugin API library (all plugin_* functions)
│   ├── pluginsLoader.js# Plugin loader/unloader (single & batch management)
│   └── MSL_VERSION     # Version file (e.g. "1.1.0")
├── plugins/            # User plugins directory
│   └── demo.js         # Example plugin
└── package.json
```

## Key Design Decisions

- Plugins are loaded at program startup, NOT after "Done" message
- Plugins run in a sandbox with `plugin_*` functions injected
- Each plugin's registrations (events, commands, APIs, timers) are tracked by pluginName for single-plugin unload
- The `serverLog` event is excluded from debug logging to avoid spam
- The `/` prefix command matching requires the `/` to be prepended before calling `matchCommand`
- Plugin errors in event handlers, command handlers, API handlers, and command callbacks are caught with try-catch to prevent crashes
- `setTimeout`/`setInterval` in plugins are wrapped to track timer IDs per plugin; they are auto-cleared on plugin unload

## Log Format Standard

ALL log output must follow this format:
```
[HH:mm:ss INFO]: [MinecraftServerListener] message
[HH:mm:ss WARN]: [MinecraftServerListener] message
[HH:mm:ss ERROR]: [MinecraftServerListener] message
```

Plugin logs use:
```
[HH:mm:ss INFO]: [pluginName] message
```

Use the `log(message)` function in index.js and pluginsLoader.js for MSL logs.
Use `plugin_log(type, message)` in plugins for plugin logs.
Use `debugLog(message)` for debug-only output (respects debug mode).

## Plugin API Reference

All `plugin_*` functions are injected into the plugin sandbox. Plugins do NOT need to require anything.

| Function | Signature | Description |
|----------|-----------|-------------|
| `plugin_require` | `(moduleName) => any` | Import Node.js module |
| `plugin_executeCommand` | `(command, fn?) => void` | Execute MC command, optional callback for response |
| `plugin_startServer` | `() => void` | Start Minecraft server |
| `plugin_forceStopServer` | `() => void` | Force kill Minecraft server process (taskkill on Windows, SIGKILL on Linux) |
| `plugin_registerCommand` | `(expression, fn) => void` | Register command: `"!ping"` or `"!ban <player> <reason>"` |
| `plugin_onEvent` | `(eventName, fn) => void` | Listen to event |
| `plugin_triggerEvent` | `(eventName, ...args) => void` | Trigger custom event |
| `plugin_sendQQMessage` | `(text) => void` | **DEPRECATED since v1.1.0** - No longer functional, logs a warning |
| `plugin_log` | `(type, message) => void` | Log: INFO/WARN/ERROR |
| `plugin_generateOfflineUUID` | `(name) => string` | Generate offline UUID |
| `plugin_registerApi` | `(method, path, fn) => void` | Register HTTP API endpoint |
| `plugin_push` | `(key, value) => void` | Store global data |
| `plugin_pull` | `(key) => any` | Retrieve global data |
| `plugin_getPluginsList` | `() => {loaded[], unloaded[], all[]}` | Get plugin lists |

## Native Events

| Event | Parameters | Description |
|-------|-----------|-------------|
| `serverLog` | line | Every server log line |
| `serverStart` | (none) | Server process started |
| `serverStop` | (none) | Server process stopped |
| `serverDone` | (none) | Server startup complete |
| `pluginLoaded` | pluginName | A plugin has been loaded |
| `playerJoin` | time, player | Player joined |
| `playerQuit` | time, player | Player left |
| `playerSendMessage` | time, player, message | Player sent chat message |
| `playerSendCommand` | time, player, command, args | Player executed command |

## MSL Console Commands

| Command | Description |
|---------|-------------|
| `msl` or `msl help` | Show help |
| `msl version` | Show MSL version |
| `msl reload` | Reload all plugins |
| `msl stopmc` | Stop MC server |
| `msl startmc` | Start MC server |
| `msl disable_plugin <name\|all>` | Unload plugin(s) |
| `msl enable_plugin <name\|all>` | Load plugin(s) |
| `msl list_plugins` | List all plugins with status |
| `msl debug [on\|off]` | Toggle/view debug mode |
| `msl disable_http` | Disable HTTP service |
| `msl enable_http` | Enable HTTP service |

## Configuration (config.js)

Key sections:
- `debug` - boolean, controls debug logging (can be toggled at runtime with `msl debug`)
- `api.port` - HTTP API port
- `api.token` - API authentication token
- `minecraft.args` - Server start command array (java args)
- `minecraft.cwd` - Server working directory
- `minecraft.autoRestart` - Auto restart on crash
- `minecraft.logRegexs` - Regex patterns for log parsing

## Important Notes

- `config.js` is gitignored; `config.example.js` is the template
- Plugin files must be `.js` files in the `plugins/` directory
- The `plugin_registerCommand` expression format: prefix char (`!` or `/`) + command name + optional `<param>` placeholders
- Command matching is strict: number of parts must match exactly
- `plugin_executeCommand` with callback captures 500ms of server response
- `manualStop` flag prevents auto-restart when server is stopped via `msl stopmc`
- `plugin_sendQQMessage` is deprecated since v1.1.0 and will be removed in a future version
- All HTTP endpoints (including `/execCommand` and plugin APIs) require `Authorization: Bearer <token>` header for authentication
- Token is configured in `config.api.token`
