const crypto = require('crypto');
const http = require('http');
const https = require('https');
const config = require('./config');

const globalStore = {};
const eventListeners = {};
const registeredCommands = [];
const registeredApis = [];

function getTimestamp() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

function debugLog(message) {
    if (config.debug) {
        console.log(`[${getTimestamp()} INFO]: [MinecraftServerListener] ${message}`);
    }
}

function plugin_require(moduleName) {
    debugLog(`plugin_require('${moduleName}')`);
    return require(moduleName);
}

function plugin_executeCommand(command, fn) {
    debugLog(`plugin_executeCommand('${command}'${fn ? ', [callback]' : ''})`);
    if (module.exports.sendCommand) {
        if (fn) {
            module.exports.sendCommand(command, fn);
        } else {
            module.exports.sendCommand(command);
        }
    }
}

function plugin_registerCommand(expression, fn) {
    debugLog(`plugin_registerCommand('${expression}')`);
    const parts = expression.split(' ');
    const prefix = parts[0].charAt(0);
    const commandName = parts[0].substring(1);
    const paramNames = parts.slice(1).map(p => {
        if (p.startsWith('<') && p.endsWith('>')) {
            return { name: p.slice(1, -1), isParam: true };
        }
        return { name: p, isParam: false };
    });

    registeredCommands.push({
        prefix,
        commandName,
        paramNames,
        fullExpression: expression,
        fn
    });
}

function plugin_push(key, value) {
    debugLog(`plugin_push('${key}', ...)`);
    globalStore[key] = value;
}

function plugin_pull(key) {
    debugLog(`plugin_pull('${key}')`);
    return globalStore[key];
}

function plugin_onEvent(eventName, fn) {
    debugLog(`plugin_onEvent('${eventName}')`);
    if (!eventListeners[eventName]) {
        eventListeners[eventName] = [];
    }
    eventListeners[eventName].push(fn);
}

function plugin_triggerEvent(eventName, ...args) {
    debugLog(`plugin_triggerEvent('${eventName}', ${args.join(', ')})`);
    if (eventListeners[eventName]) {
        eventListeners[eventName].forEach(fn => fn(...args));
    }
}

function plugin_generateOfflineUUID(playerName) {
    debugLog(`plugin_generateOfflineUUID('${playerName}')`);
    const hash = crypto.createHash('md5').update('OfflinePlayer:' + playerName).digest();
    hash[6] = (hash[6] & 0x0f) | 0x30;
    hash[8] = (hash[8] & 0x3f) | 0x80;
    const hex = hash.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function plugin_registerApi(method, path, fn) {
    debugLog(`plugin_registerApi('${method}', '${path}')`);
    registeredApis.push({ method: method.toUpperCase(), path, fn });
}

function plugin_log(type, message, pluginName) {
    const time = getTimestamp();
    const prefix = `[${time} ${type}]: [${pluginName}]`;
    if (type === 'WARN') {
        console.log(`\x1b[33m${prefix} ${message}\x1b[0m`);
    } else if (type === 'ERROR') {
        console.log(`\x1b[31m${prefix} ${message}\x1b[0m`);
    } else {
        console.log(`${prefix} ${message}`);
    }
}

function matchCommand(prefix, playerName, content) {
    for (const cmd of registeredCommands) {
        if (cmd.prefix !== prefix) continue;

        const parts = content.split(' ');
        const inputCommandName = parts[0].substring(1);
        if (inputCommandName !== cmd.commandName) continue;

        const expectedLength = 1 + cmd.paramNames.length;
        if (parts.length !== expectedLength) continue;

        const args = parts.slice(1);
        const paramValues = [];
        let valid = true;

        for (let i = 0; i < cmd.paramNames.length; i++) {
            const param = cmd.paramNames[i];
            if (param.isParam) {
                paramValues.push(args[i]);
            } else {
                if (args[i] !== param.name) {
                    valid = false;
                    break;
                }
            }
        }

        if (!valid) continue;

        debugLog(`Command matched: ${cmd.fullExpression}, player: ${playerName}, args: ${JSON.stringify(paramValues)}`);
        cmd.fn(playerName, ...paramValues);
        return true;
    }
    return false;
}

function plugin_sendQQMessage(text) {
    debugLog(`plugin_sendQQMessage('${text}')`);
    
    const qqbot = config.qqbot;
    const url = new URL(qqbot.server);
    const isHttps = url.protocol === 'https:';
    const requestLib = isHttps ? https : http;
    
    const postData = JSON.stringify({
        group_id: qqbot.groupIds[0],
        message: text
    });
    
    const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: '/send_group_msg',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': `Bearer ${qqbot.token}`
        }
    };
    
    const req = requestLib.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            debugLog(`QQ消息发送响应: ${data}`);
        });
    });
    
    req.on('error', (err) => {
        debugLog(`QQ消息发送失败: ${err.message}`);
    });
    
    req.write(postData);
    req.end();
}

function clearAll() {
    registeredCommands.length = 0;
    registeredApis.length = 0;
    for (const key in eventListeners) {
        delete eventListeners[key];
    }
    for (const key in globalStore) {
        delete globalStore[key];
    }
}

module.exports = {
    plugin_require,
    plugin_executeCommand,
    plugin_registerCommand,
    plugin_push,
    plugin_pull,
    plugin_onEvent,
    plugin_triggerEvent,
    plugin_generateOfflineUUID,
    plugin_registerApi,
    plugin_log,
    plugin_sendQQMessage,
    matchCommand,
    clearAll,
    getRegisteredApis: () => registeredApis,
    getEventListeners: () => eventListeners,
    sendCommand: null
};
