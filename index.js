const { spawn } = require('child_process');
const http = require('http');
const config = require('./config');
const libs = require('./pluginsLibs');
const pluginsLoader = require('./pluginsLoader');

if (process.platform === 'win32') {
    process.stdout.setDefaultEncoding('utf8');
    process.stderr.setDefaultEncoding('utf8');
    process.stdin.setDefaultEncoding('utf8');
}

let minecraftProcess = null;
let logBuffer = '';
let httpEnabled = true;

function getTimestamp() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

function log(message) {
    console.log(`[${getTimestamp()} INFO]: [MinecraftServerListener] ${message}`);
}

let commandResponseCapture = null;

libs.sendCommand = function(command, fn) {
    if (minecraftProcess && minecraftProcess.stdin.writable) {
        if (fn) {
            commandResponseCapture = {
                lines: [],
                callback: fn,
                timer: setTimeout(() => {
                    if (commandResponseCapture) {
                        commandResponseCapture.callback(commandResponseCapture.lines);
                        commandResponseCapture = null;
                    }
                }, 500)
            };
        }
        minecraftProcess.stdin.write(command + '\n');
    }
};

function parseLogLine(line) {
    pluginsLoader.checkServerDone(line);

    if (!pluginsLoader.isLoaded()) return;

    const regexs = config.minecraft.logRegexs;
    
    let match = line.match(regexs.playerJoin);
    if (match) {
        libs.plugin_triggerEvent('playerJoin', match[1], match[2]);
        return;
    }
    
    match = line.match(regexs.playerQuit);
    if (match) {
        libs.plugin_triggerEvent('playerQuit', match[1], match[2]);
        return;
    }
    
    match = line.match(regexs.playerSendMessage);
    if (match) {
        const time = match[1];
        const player = match[2];
        const message = match[3];
        libs.plugin_triggerEvent('playerSendMessage', time, player, message);
        libs.matchCommand('!', player, message);
        return;
    }
    
    match = line.match(regexs.playerSendCommand);
    if (match) {
        const time = match[1];
        const player = match[2];
        const fullCommand = match[3];
        const parts = fullCommand.split(' ');
        const commandName = parts[0];
        const args = parts.slice(1);
        libs.plugin_triggerEvent('playerSendCommand', time, player, commandName, args);
        libs.matchCommand('/', player, fullCommand);
        return;
    }
}

function startMinecraftServer() {
    const args = config.minecraft.args;
    
    const parsedArgs = args.map(arg => {
        if (arg.startsWith('"') && arg.endsWith('"')) {
            return arg.slice(1, -1);
        }
        return arg;
    });
    
    const command = parsedArgs[0];
    const commandArgs = parsedArgs.slice(1);
    
    minecraftProcess = spawn(command, commandArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        cwd: config.minecraft.cwd
    });
    
    minecraftProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
        
        logBuffer += data.toString();
        const lines = logBuffer.split('\n');
        logBuffer = lines.pop() || '';
        
        lines.forEach(line => {
            if (commandResponseCapture) {
                commandResponseCapture.lines.push(line.trim());
            }
            if (line.trim()) {
                parseLogLine(line.trim());
            }
        });
    });
    
    minecraftProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
    });
    
    minecraftProcess.on('close', (code) => {
        console.log(`Minecraft服务器进程退出，代码: ${code}`);
        if (config.minecraft.autoRestart.enable) {
            console.log('自动重启中...');
            
            if (config.minecraft.autoRestart.sendQQBotMessage && config.qqbot.groupIds.length > 0) {
                const time = getTimestamp();
                const message = config.qqbot.autoRestartMessage.replace('{time}', time);
                libs.plugin_sendQQMessage(message);
            }
            
            setTimeout(() => {
                startMinecraftServer();
            }, 3000);
        }
    });
    
    minecraftProcess.on('error', (err) => {
        console.error('启动Minecraft服务器失败:', err);
    });
}

function handleMslCommand(input) {
    const trimmed = input.trim();
    const parts = trimmed.split(/\s+/);
    
    if (parts[0] !== 'msl') return false;
    
    const subCommand = parts[1];
    
    switch (subCommand) {
        case 'reload':
            pluginsLoader.reloadPlugins();
            return true;
        case 'disable_plugins':
            pluginsLoader.disablePlugins();
            return true;
        case 'enable_plugins':
            pluginsLoader.enablePlugins();
            return true;
        case 'disable_http':
            if (!httpEnabled) {
                log('HTTP service is already disabled');
            } else {
                httpEnabled = false;
                log('HTTP service has been disabled');
            }
            return true;
        case 'enable_http':
            if (httpEnabled) {
                log('HTTP service is already enabled');
            } else {
                httpEnabled = true;
                log('HTTP service has been enabled');
            }
            return true;
        default:
            log(`Unknown msl command: ${subCommand}`);
            return true;
    }
}

process.stdin.on('data', (data) => {
    const input = data.toString();
    
    if (handleMslCommand(input)) return;
    
    if (minecraftProcess && minecraftProcess.stdin.writable) {
        minecraftProcess.stdin.write(data);
    }
});

function handlePluginApis(req, res) {
    const apis = libs.getRegisteredApis();
    for (const api of apis) {
        if (api.method === req.method && req.url === api.path) {
            api.fn(req, res);
            return true;
        }
    }
    return false;
}

const server = http.createServer((req, res) => {
    if (!httpEnabled) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'HTTP service is disabled' }));
        return;
    }

    if (handlePluginApis(req, res)) return;

    if (req.method === 'POST' && req.url === '/execCommand') {
        let body = '';
        
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                if (!data.token || data.token !== config.api.token) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: '无效的token' }));
                    return;
                }
                
                if (!data.command) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: '缺少command参数' }));
                    return;
                }
                
                if (minecraftProcess && minecraftProcess.stdin.writable) {
                    minecraftProcess.stdin.write(data.command + '\n');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: '命令已发送' }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Minecraft服务器未运行' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: '无效的JSON格式' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: '未找到接口' }));
    }
});

server.listen(config.api.port, () => {
    console.log(`HTTP Server已启动，监听端口: ${config.api.port}`);
});

startMinecraftServer();
