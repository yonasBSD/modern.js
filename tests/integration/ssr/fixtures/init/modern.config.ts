import { applyBaseConfig } from '../../../../utils/applyBaseConfig';

export default applyBaseConfig({
  server: {
    ssr: true,
  },
  source: {
    enableAsyncEntry: true,
    enableCustomEntry: true,
  },
});
