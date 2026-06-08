import { loadPlugins } from '../plugins/plugin-loader.js';
import { PluginService } from '../plugins/plugin-service.js';
import {
    PLUGINS_DIR
} from '../config/paths.js';

export async function bootstrapPlugins() {

    const service = new PluginService();

    const plugins = await loadPlugins(
        PLUGINS_DIR
    );

    for (const plugin of plugins) {
        service.register(plugin);
    }

    console.log(`${plugins.length} plugins loaded`);

    plugins.forEach(plugin => {
        console.log(` - ${plugin.id}`);
    });

    return service;
}
