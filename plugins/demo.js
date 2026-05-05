/**
 * MinecraftServerListener Plugin Development Example
 * 
 * This file demonstrates all available plugin APIs
 */

const fs = plugin_require("fs");

plugin_log("INFO", "Demo plugin loaded");

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

plugin_registerCommand("!ping", (player) => {
    plugin_executeCommand(`say ${player} requested ping`);
    plugin_log("INFO", `${player} used !ping command`);
}, "demo");

plugin_registerCommand("!online", (player) => {
    plugin_executeCommand("list", (lines) => {
        lines.forEach(line => {
            if (line.includes("players online")) {
                plugin_sendQQMessage(`Online players: ${line}`);
            }
        });
    });
}, "demo");

plugin_registerApi("GET", "/api/demo", (req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
        success: true, 
        message: "Hello from MinecraftServerListener!" 
    }));
});

const uuid = plugin_generateOfflineUUID("Steve");
plugin_log("INFO", `Steve's offline UUID: ${uuid}`);

plugin_push("demoData", {
    version: "1.0.0",
    author: "MinecraftServerListener"
});

const data = plugin_pull("demoData");
plugin_log("INFO", `Plugin data: ${JSON.stringify(data)}`);
