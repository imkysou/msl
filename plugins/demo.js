/**
 * MinecraftServerListener Plugin Development Example
 * 
 * This file demonstrates all available plugin APIs
 */

plugin_log("INFO", "Demo plugin loaded");

// Event listeners
plugin_onEvent("serverStart", () => {
    plugin_log("INFO", "Server process started");
});

plugin_onEvent("serverStop", () => {
    plugin_log("INFO", "Server process stopped");
});

plugin_onEvent("playerJoin", (time, player) => {
    plugin_log("INFO", `Player ${player} joined at ${time}`);
});

plugin_onEvent("playerQuit", (time, player) => {
    plugin_log("INFO", `Player ${player} left at ${time}`);
});

plugin_onEvent("playerSendMessage", (time, player, message) => {
    plugin_log("INFO", `[${time}] ${player}: ${message}`);
});

plugin_onEvent("playerSendCommand", (time, player, command, args) => {
    plugin_log("INFO", `[${time}] ${player} executed /${command} ${args.join(' ')}`);
});

// Custom command: !ping
plugin_registerCommand("!ping", (player) => {
    plugin_executeCommand(`say ${player} requested ping`);
    plugin_log("INFO", `${player} used !ping command`);
});

// Custom command with response capture: !online
plugin_registerCommand("!online", (player) => {
    plugin_executeCommand("list", (lines) => {
        lines.forEach(line => {
            if (line.includes("players online")) {
                plugin_log("INFO", `Online players: ${line}`);
            }
        });
    });
});

// Custom event trigger
plugin_triggerEvent("demoLoaded", "demo");

// HTTP API endpoint
plugin_registerApi("GET", "/api/demo", (req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
        success: true, 
        message: "Hello from MinecraftServerListener!" 
    }));
});

// Generate offline UUID
const uuid = plugin_generateOfflineUUID("Steve");
plugin_log("INFO", `Steve's offline UUID: ${uuid}`);

// Global data store
plugin_push("demoData", {
    version: "1.0.0",
    author: "MinecraftServerListener"
});

const data = plugin_pull("demoData");
plugin_log("INFO", `Plugin data: ${JSON.stringify(data)}`);

// Server control (commented out to avoid accidental use)
// plugin_startServer();
// plugin_forceStopServer();

// Plugin list
const plugins = plugin_getPluginsList();
plugin_log("INFO", `Plugins: ${plugins.loaded.join(', ') || 'none'}`);
