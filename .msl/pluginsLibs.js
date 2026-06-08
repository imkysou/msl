const crypto = require('crypto');
const config = require('../config');

const globalStore = {};
const eventListeners = {};
const registeredCommands = [];
const registeredApis = [];
const pluginTimers = {};
let debugEnabled = config.debug;

function setDebug(value) {
    debugEnabled = value;
}

function isDebugEnabled() {
    return debugEnabled;
}

function getTimestamp() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

function debugLog(message) {
    if (debugEnabled) {
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

function plugin_registerCommand(expression, fn, pluginName) {
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
        fn,
        pluginName
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

function plugin_onEvent(eventName, fn, pluginName) {
    debugLog(`plugin_onEvent('${eventName}')`);
    if (!eventListeners[eventName]) {
        eventListeners[eventName] = [];
    }
    eventListeners[eventName].push({ fn, pluginName });
}

function plugin_triggerEvent(eventName, ...args) {
    if (eventName !== 'serverLog') {
        debugLog(`plugin_triggerEvent('${eventName}', ${args.join(', ')})`);
    }
    if (eventListeners[eventName]) {
        eventListeners[eventName].forEach(entry => {
            try {
                entry.fn(...args);
            } catch (err) {
                plugin_log('ERROR', `Event '${eventName}' handler error in plugin '${entry.pluginName}': ${err.message}`, entry.pluginName);
            }
        });
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

function plugin_registerApi(method, path, fn, pluginName) {
    debugLog(`plugin_registerApi('${method}', '${path}')`);
    registeredApis.push({ method: method.toUpperCase(), path, fn, pluginName });
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
        try {
            cmd.fn(playerName, ...paramValues);
        } catch (err) {
            plugin_log('ERROR', `Command '${cmd.fullExpression}' handler error in plugin '${cmd.pluginName}': ${err.message}`, cmd.pluginName);
        }
        return true;
    }
    return false;
}

function plugin_sendQQMessage(text) {
    debugLog(`plugin_sendQQMessage('${text}')`);
    plugin_log('WARN', 'plugin_sendQQMessage is deprecated since v1.1.0 and will be removed in a future version. This call has no effect.', 'MinecraftServerListener');
}

function clearPlugin(pluginName) {
    for (const key in eventListeners) {
        eventListeners[key] = eventListeners[key].filter(entry => entry.pluginName !== pluginName);
        if (eventListeners[key].length === 0) {
            delete eventListeners[key];
        }
    }
    for (let i = registeredCommands.length - 1; i >= 0; i--) {
        if (registeredCommands[i].pluginName === pluginName) {
            registeredCommands.splice(i, 1);
        }
    }
    for (let i = registeredApis.length - 1; i >= 0; i--) {
        if (registeredApis[i].pluginName === pluginName) {
            registeredApis.splice(i, 1);
        }
    }
    _clearPluginTimers(pluginName);
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
    for (const key in pluginTimers) {
        _clearPluginTimers(key);
    }
}

function plugin_getPluginsList() {
    debugLog('plugin_getPluginsList()');
    if (module.exports._getPluginsList) {
        return module.exports._getPluginsList();
    }
    return { loaded: [], unloaded: [], all: [] };
}

function _addPluginTimer(pluginName, id) {
    if (!pluginTimers[pluginName]) {
        pluginTimers[pluginName] = [];
    }
    pluginTimers[pluginName].push(id);
}

function _removePluginTimer(pluginName, id) {
    if (pluginTimers[pluginName]) {
        const idx = pluginTimers[pluginName].indexOf(id);
        if (idx !== -1) {
            pluginTimers[pluginName].splice(idx, 1);
        }
    }
}

function _clearPluginTimers(pluginName) {
    if (pluginTimers[pluginName]) {
        for (const id of pluginTimers[pluginName]) {
            clearTimeout(id);
        }
        delete pluginTimers[pluginName];
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
    clearPlugin,
    clearAll,
    plugin_getPluginsList,
    setDebug,
    isDebugEnabled,
    getRegisteredApis: () => registeredApis,
    getEventListeners: () => eventListeners,
    sendCommand: null,
    _getPluginsList: null,
    _addPluginTimer,
    _removePluginTimer,
    _clearPluginTimers
};
