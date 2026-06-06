export class PluginError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PluginError';
    }
}

export class PluginValidationError extends PluginError {
    constructor(pluginId, message) {
        super(`[${pluginId}] ${message}`);
        this.name = 'PluginValidationError';
    }
}
