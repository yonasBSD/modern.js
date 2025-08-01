import { getPolyfillString } from '@modern-js/polyfill-lib';
import type { ServerPlugin } from '@modern-js/server-core';
import { mime } from '@modern-js/utils';
import Parser from 'ua-parser-js';
import { defaultPolyfill, getDefaultFeatures } from './const';
import PolyfillCache, { generateCacheKey } from './libs/cache';

export default (): ServerPlugin => ({
  name: '@modern-js/plugin-polyfill',

  setup: api => {
    api.onPrepare(() => {
      const cache = new PolyfillCache();
      const route = defaultPolyfill;
      const features = getDefaultFeatures();
      const minify = process.env.NODE_ENV === 'production';

      const featureDig = Object.keys(features)
        .map(name => {
          const { flags = ['gated'] } = features[name];
          const flagStr = flags.join(',');

          return `${name}-${flagStr}`;
        })
        .join(',');
      const { serverBase } = api.getServerContext();
      serverBase?.get('*', async (context: any, next: any) => {
        if (context.req.path !== route) {
          return next();
        }

        const parsedUA = Parser(context.req.header('user-agent'));
        const { name = '', version = '' } = parsedUA.browser;

        const cacheKey = generateCacheKey({
          name,
          version,
          features: featureDig,
          minify,
        });
        const matched = cache.get(cacheKey);
        if (matched) {
          context.res.headers.set(
            'content-type',
            mime.contentType('js') as string,
          );
          return context.body(matched);
        }

        const polyfill = await getPolyfillString({
          uaString: context.req.header('user-agent') as string,
          minify,
          features,
        });

        cache.set(cacheKey, polyfill);
        context.res.headers.set(
          'content-type',
          mime.contentType('js') as string,
        );
        return context.body(polyfill);
      });
    });
  },
});
