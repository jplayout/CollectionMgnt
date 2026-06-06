export class PluginService {

    constructor() {
        this.plugins = new Map();
    }

    register(plugin) {

        if (this.plugins.has(plugin.id)) {
            throw new Error(
                `Plugin ${plugin.id} already loaded`
            );
        }

        this.plugins.set(
            plugin.id,
            plugin
        );
    }

    getAll() {
        return Array.from(
            this.plugins.values()
        );
    }

    getById(id) {
        return this.plugins.get(id);
    }

    exists(id) {
        return this.plugins.has(id);
    }

    getFields(pluginId) {

    const plugin =
        this.getById(
            pluginId
        );

    if (!plugin) {
        return null;
    }

    return plugin.fields;

    }
}