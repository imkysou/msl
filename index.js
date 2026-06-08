const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const libs = require('./.msl/pluginsLibs');
const pluginsLoader = require('./.msl/pluginsLoader');

if (process.platform === 'win32') {
    process.stdout.setDefaultEncoding('utf8');
    process.stderr.setDefaultEncoding('utf8');
    process.stdin.setDefaultEncoding('utf8');
}

let minecraftProcess = null;
let logBuffer = '';
let httpEnabled = true;
let manualStop = false;

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

const MSL_VERSION = fs.readFileSync(path.join(__dirname, '.msl', 'MSL_VERSION'), 'utf-8').trim();

let commandResponseCaptures = [];

libs._getPluginsList = pluginsLoader.getPluginsList;

libs.startServer = function() {
    startMinecraftServer();
};

libs.forceStopServer = function() {
    if (minecraftProcess) {
        manualStop = true;
        if (process.platform === 'win32') {
            spawn('taskkill', ['/T', '/F', '/PID', minecraftProcess.pid.toString()], { stdio: 'ignore' });
        } else {
            process.kill(-minecraftProcess.pid, 'SIGKILL');
        }
        log('Minecraft server process force killed');
    }
};

libs.sendCommand = function(command, fn) {
    if (minecraftProcess && minecraftProcess.stdin.writable) {
        if (fn) {
            const capture = {
                lines: [],
                callback: fn,
                timer: setTimeout(() => {
                    const idx = commandResponseCaptures.indexOf(capture);
                    if (idx !== -1) {
                        commandResponseCaptures.splice(idx, 1);
                    }
                    try {
                        capture.callback(capture.lines);
                    } catch (err) {
                        log(`Plugin command callback error: ${err.message}`);
                    }
                }, 500)
            };
            commandResponseCaptures.push(capture);
        }
        minecraftProcess.stdin.write(command + '\n');
    }
};

function parseLogLine(line) {
    libs.plugin_triggerEvent('serverLog', line);

    if (line.includes(' INFO]: Done (')) {
        libs.plugin_triggerEvent('serverDone');
    }

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
        libs.matchCommand('/', player, '/' + fullCommand);
        return;
    }
}

function startMinecraftServer() {
    if (minecraftProcess) {
        log('Minecraft server is already running');
        return;
    }

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
        cwd: config.minecraft.cwd,
        detached: process.platform !== 'win32'
    });

    libs.plugin_triggerEvent('serverStart');

    minecraftProcess.stdout.on('data', (data) => {
        process.stdout.write(data);

        logBuffer += data.toString();
        const lines = logBuffer.split('\n');
        logBuffer = lines.pop() || '';

        lines.forEach(line => {
            if (commandResponseCaptures.length > 0) {
                commandResponseCaptures.forEach(capture => {
                    capture.lines.push(line.trim());
                });
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
        log(`Minecraft server process exited with code: ${code}`);
        libs.plugin_triggerEvent('serverStop');
        minecraftProcess = null;

        if (!manualStop && config.minecraft.autoRestart.enable) {
            log('Auto restarting...');

            setTimeout(() => {
                startMinecraftServer();
            }, 3000);
        }
        manualStop = false;
    });

    minecraftProcess.on('error', (err) => {
        log(`Failed to start Minecraft server: ${err.message}`);
        minecraftProcess = null;
    });
}

function showMslHelp() {
    console.log('');
    log('MSL Commands:');
    console.log('  msl help              - Show this help message');
    console.log('  msl version           - Show MSL version');
    console.log('  msl reload            - Reload all plugins');
    console.log('  msl stopmc            - Stop Minecraft server');
    console.log('  msl startmc           - Start Minecraft server');
    console.log('  msl disable_plugin <name|all> - Unload plugin(s)');
    console.log('  msl enable_plugin <name|all>  - Load plugin(s)');
    console.log('  msl list_plugins      - List all plugins');
    console.log('  msl debug [on|off]    - Toggle debug mode');
    console.log('  msl disable_http      - Disable HTTP service');
    console.log('  msl enable_http       - Enable HTTP service');
    console.log('');
}

function handleMslCommand(input) {
    const trimmed = input.trim();
    const parts = trimmed.split(/\s+/);

    if (parts[0] !== 'msl') return false;

    const subCommand = parts[1];

    switch (subCommand) {
        case 'help':
        case undefined:
            showMslHelp();
            return true;
        case 'version':
            log(`MSL Version: ${MSL_VERSION}`);
            return true;
        case 'reload':
            pluginsLoader.reloadPlugins();
            return true;
        case 'stopmc':
            if (minecraftProcess && minecraftProcess.stdin.writable) {
                manualStop = true;
                minecraftProcess.stdin.write('stop\n');
                log('Stopping Minecraft server...');
            } else {
                log('Minecraft server is not running');
            }
            return true;
        case 'startmc':
            if (minecraftProcess) {
                log('Minecraft server is already running');
            } else {
                startMinecraftServer();
            }
            return true;
        case 'disable_plugin':
            if (!parts[2]) {
                log('Usage: msl disable_plugin <pluginName|all>');
                return true;
            }
            if (parts[2] === 'all') {
                pluginsLoader.unloadAllPlugins();
            } else {
                pluginsLoader.unloadPlugin(parts[2]);
            }
            return true;
        case 'enable_plugin':
            if (!parts[2]) {
                log('Usage: msl enable_plugin <pluginName|all>');
                return true;
            }
            if (parts[2] === 'all') {
                pluginsLoader.loadAllPlugins();
            } else {
                pluginsLoader.loadPlugin(parts[2]);
            }
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
        case 'debug':
            if (parts[2] === 'on') {
                libs.setDebug(true);
                log('Debug mode is now ON');
            } else if (parts[2] === 'off') {
                libs.setDebug(false);
                log('Debug mode is now OFF');
            } else {
                log(`Debug mode is ${libs.isDebugEnabled() ? 'ON' : 'OFF'}`);
            }
            return true;
        case 'list_plugins':
            pluginsLoader.listPlugins();
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

function verifyToken(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return false;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return false;
    return parts[1] === config.api.token;
}

function handlePluginApis(req, res) {
    const apis = libs.getRegisteredApis();
    for (const api of apis) {
        if (api.method === req.method && req.url === api.path) {
            if (!verifyToken(req)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Unauthorized: invalid or missing token' }));
                return true;
            }
            try {
                api.fn(req, res);
            } catch (err) {
                log(`Plugin API '${api.path}' error in plugin '${api.pluginName}': ${err.message}`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Internal plugin error' }));
            }
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
        if (!verifyToken(req)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized: invalid or missing token' }));
            return;
        }

        let body = '';
        let bodySize = 0;
        const MAX_BODY_SIZE = 1024 * 1024; // 1MB

        req.on('data', (chunk) => {
            bodySize += chunk.length;
            if (bodySize > MAX_BODY_SIZE) {
                req.destroy();
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Request body too large' }));
                return;
            }
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);

                if (!data.command) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Missing command parameter' }));
                    return;
                }

                if (minecraftProcess && minecraftProcess.stdin.writable) {
                    minecraftProcess.stdin.write(data.command + '\n');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Command sent' }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Minecraft server is not running' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON format' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Not found' }));
    }
});

server.listen(config.api.port, () => {
    log(`HTTP Server is running on port ${config.api.port}`);
});

pluginsLoader.loadAllPlugins();
startMinecraftServer();
