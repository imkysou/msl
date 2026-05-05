const fs = require('fs');
const path = require('path');
const libs = require('./pluginsLibs');

const pluginsDir = path.join(__dirname, '..', 'plugins');
const loadedPlugins = new Set();

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

function loadPlugin(pluginName) {
    if (loadedPlugins.has(pluginName)) {
        log(`Plugin '${pluginName}' is already loaded`);
        return;
    }

    const fileName = pluginName + '.js';
    const pluginPath = path.join(pluginsDir, fileName);

    if (!fs.existsSync(pluginPath)) {
        log(`Plugin '${pluginName}' not found`);
        return;
    }

    log(`Plugin '${pluginName}' is loading...`);

    try {
        const code = fs.readFileSync(pluginPath, 'utf-8');

        const sandbox = {
            plugin_require: libs.plugin_require,
            plugin_executeCommand: libs.plugin_executeCommand,
            plugin_registerCommand: (expression, fn) => libs.plugin_registerCommand(expression, fn, pluginName),
            plugin_push: libs.plugin_push,
            plugin_pull: libs.plugin_pull,
            plugin_onEvent: (eventName, fn) => libs.plugin_onEvent(eventName, fn, pluginName),
            plugin_triggerEvent: libs.plugin_triggerEvent,
            plugin_generateOfflineUUID: libs.plugin_generateOfflineUUID,
            plugin_registerApi: (method, path, fn) => libs.plugin_registerApi(method, path, fn, pluginName),
            plugin_log: (type, message) => libs.plugin_log(type, message, pluginName),
            plugin_sendQQMessage: libs.plugin_sendQQMessage,
            plugin_getPluginsList: libs.plugin_getPluginsList,
            console: {
                log: (...args) => libs.plugin_log('INFO', args.join(' '), pluginName),
                warn: (...args) => libs.plugin_log('WARN', args.join(' '), pluginName),
                error: (...args) => libs.plugin_log('ERROR', args.join(' '), pluginName)
            }
        };

        const fn = new Function(...Object.keys(sandbox), code);
        fn(...Object.values(sandbox));

        loadedPlugins.add(pluginName);

        log(`Plugin '${pluginName}' is done`);

        libs.plugin_triggerEvent('pluginLoaded', pluginName);
    } catch (err) {
        log(`Plugin '${pluginName}' failed to load: ${err.message}`);
    }
}

function unloadPlugin(pluginName) {
    if (!loadedPlugins.has(pluginName)) {
        log(`Plugin '${pluginName}' is not loaded`);
        return;
    }

    libs.clearPlugin(pluginName);
    loadedPlugins.delete(pluginName);
    log(`Plugin '${pluginName}' has been unloaded`);
}

function loadAllPlugins() {
    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));

    files.forEach(file => {
        const pluginName = path.basename(file, '.js');
        if (!loadedPlugins.has(pluginName)) {
            loadPlugin(pluginName);
        }
    });
}

function unloadAllPlugins() {
    for (const pluginName of loadedPlugins) {
        libs.clearPlugin(pluginName);
    }
    loadedPlugins.clear();
    log('All plugins have been unloaded');
}

function reloadPlugins() {
    unloadAllPlugins();
    loadAllPlugins();
    log('All plugins have been reloaded');
}

function isLoaded() {
    return loadedPlugins.size > 0;
}

function getLoadedPlugins() {
    return [...loadedPlugins];
}

function getPluginsList() {
    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
    const all = files.map(f => path.basename(f, '.js'));
    const loaded = all.filter(name => loadedPlugins.has(name));
    const unloaded = all.filter(name => !loadedPlugins.has(name));
    return { loaded, unloaded, all };
}

function listPlugins() {
    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
    const allPlugins = files.map(f => path.basename(f, '.js'));

    log('Plugin list:');
    allPlugins.forEach(name => {
        const status = loadedPlugins.has(name) ? 'loaded' : 'unloaded';
        console.log(`  - ${name} [${status}]`);
    });
    log(`Total: ${allPlugins.length} plugins, ${loadedPlugins.size} loaded`);
}

module.exports = {
    loadPlugin,
    unloadPlugin,
    loadAllPlugins,
    unloadAllPlugins,
    reloadPlugins,
    isLoaded,
    getLoadedPlugins,
    getPluginsList,
    listPlugins
};
