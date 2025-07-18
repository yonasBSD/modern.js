import { routerPlugin } from '@modern-js/plugin-router-v7';
import { applyBaseConfig } from '../../../../utils/applyBaseConfig';

export default applyBaseConfig({
  runtime: {
    router: true,
  },
  plugins: [routerPlugin()],
  server: {
    ssr: {
      mode: 'stream',
    },
  },
});
