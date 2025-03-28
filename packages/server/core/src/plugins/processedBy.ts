import type { ServerPluginLegacy } from '../types';

export const processedByPlugin = (): ServerPluginLegacy => ({
  name: '@modern-js/plugin-processed',

  setup(api) {
    return {
      prepare() {
        const { middlewares } = api.useAppContext();

        middlewares.push({
          name: 'processed-by',
          handler: async (c, next) => {
            await next();

            c.header('X-Processed-By', 'Modern.js');
          },
        });
      },
    };
  },
});
