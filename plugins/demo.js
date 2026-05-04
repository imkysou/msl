/**
 * MinecraftServerListener 插件开发示例
 * 
 * 本文件展示了插件开发的所有可用接口
 */

const fs = plugin_require("fs");

plugin_log("INFO", "Demo插件已加载");

plugin_onEvent("playerJoin", (time, player) => {
    plugin_log("INFO", `玩家 ${player} 于 ${time} 加入服务器`);
});

plugin_onEvent("playerQuit", (time, player) => {
    plugin_log("INFO", `玩家 ${player} 于 ${time} 离开服务器`);
});

plugin_onEvent("playerSendMessage", (time, player, message) => {
    plugin_log("INFO", `[${time}] ${player}: ${message}`);
});

plugin_onEvent("playerSendCommand", (time, player, command, args) => {
    plugin_log("INFO", `[${time}] ${player} 执行了 /${command} ${args.join(' ')}`);
});

plugin_registerCommand("!ping", (player) => {
    plugin_executeCommand(`say ${player} 请求了ping`);
    plugin_log("INFO", `${player} 使用了 !ping 指令`);
});

plugin_registerCommand("!online", (player) => {
    plugin_executeCommand("list", (lines) => {
        lines.forEach(line => {
            if (line.includes("players online")) {
                plugin_sendQQMessage(`当前在线: ${line}`);
            }
        });
    });
});

plugin_registerApi("GET", "/api/demo", (req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
        success: true, 
        message: "Hello from MinecraftServerListener!" 
    }));
});

const uuid = plugin_generateOfflineUUID("Steve");
plugin_log("INFO", `Steve的离线UUID: ${uuid}`);

plugin_push("demoData", {
    version: "1.0.0",
    author: "MinecraftServerListener"
});

const data = plugin_pull("demoData");
plugin_log("INFO", `插件数据: ${JSON.stringify(data)}`);
