import { defineConfig } from '@modern-js/module-tools/defineConfig';

export default defineConfig({
  buildConfig: {
    loader: {
      '.js': 'jsx',
    },
  },
});
