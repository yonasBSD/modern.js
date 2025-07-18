import { appTools, defineConfig } from '@modern-js/app-tools';

export default defineConfig({
  runtime: {
    router: false,
  },
  server: { ssr: true },
  plugins: [appTools()],
});
