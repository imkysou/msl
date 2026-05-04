const fs = require('fs');
const path = require('path');
const libs = require('./pluginsLibs');

const pluginsDir = path.join(__dirname, 'plugins');
let loaded = false;
let enabled = true;

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

function loadPlugins() {
    if (!enabled) {
        log('Plugins are disabled, cannot load');
        return;
    }

    if (loaded) return;
    loaded = true;

    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));

    files.forEach(file => {
        const pluginName = path.basename(file, '.js');
        const time = getTimestamp();
        console.log(`[${time} INFO]: [MinecraftServerListener]Plugin '${pluginName}' is loading...`);

        try {
            const pluginPath = path.join(pluginsDir, file);
            const code = fs.readFileSync(pluginPath, 'utf-8');

            const sandbox = {
                plugin_require: libs.plugin_require,
                plugin_executeCommand: libs.plugin_executeCommand,
                plugin_registerCommand: libs.plugin_registerCommand,
                plugin_push: libs.plugin_push,
                plugin_pull: libs.plugin_pull,
                plugin_onEvent: libs.plugin_onEvent,
                plugin_triggerEvent: libs.plugin_triggerEvent,
                plugin_generateOfflineUUID: libs.plugin_generateOfflineUUID,
                plugin_registerApi: libs.plugin_registerApi,
                plugin_log: (type, message) => libs.plugin_log(type, message, pluginName),
                plugin_sendQQMessage: libs.plugin_sendQQMessage,
                console: {
                    log: (...args) => libs.plugin_log('INFO', args.join(' '), pluginName),
                    warn: (...args) => libs.plugin_log('WARN', args.join(' '), pluginName),
                    error: (...args) => libs.plugin_log('ERROR', args.join(' '), pluginName)
                }
            };

            const fn = new Function(...Object.keys(sandbox), code);
            fn(...Object.values(sandbox));

            const doneTime = getTimestamp();
            console.log(`[${doneTime} INFO]: [MinecraftServerListener]Plugin '${pluginName}' is done`);

            libs.plugin_triggerEvent('pluginLoaded', pluginName);
        } catch (err) {
            const errTime = getTimestamp();
            console.log(`[${errTime} ERROR]: [MinecraftServerListener]Plugin '${pluginName}' failed to load: ${err.message}`);
        }
    });
}

function unloadPlugins() {
    libs.clearAll();
    loaded = false;
    log('All plugins have been unloaded');
}

function reloadPlugins() {
    unloadPlugins();
    loadPlugins();
    log('All plugins have been reloaded');
}

function disablePlugins() {
    if (!loaded) {
        log('Plugins are not loaded');
        return;
    }
    unloadPlugins();
    enabled = false;
    log('Plugins have been disabled');
}

function enablePlugins() {
    if (loaded) {
        log('Plugins are already loaded');
        return;
    }
    if (enabled) {
        log('Plugins are already enabled');
        return;
    }
    enabled = true;
    loadPlugins();
    log('Plugins have been enabled');
}

function checkServerDone(line) {
    if (line.includes(' INFO]: Done (') && !loaded && enabled) {
        loadPlugins();
        return true;
    }
    return false;
}

function isLoaded() {
    return loaded;
}

function isEnabled() {
    return enabled;
}

module.exports = {
    loadPlugins,
    unloadPlugins,
    reloadPlugins,
    disablePlugins,
    enablePlugins,
    checkServerDone,
    isLoaded,
    isEnabled
};
