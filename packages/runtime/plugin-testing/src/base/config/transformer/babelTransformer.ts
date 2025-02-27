import { isSupportAutomaticJsx } from '@modern-js/utils';
import babelJest from 'babel-jest';

const isNewJsx = isSupportAutomaticJsx(process.cwd());

const babelTransformer = (babelJest.createTransformer as any)?.({
  presets: [
    [
      require.resolve('@modern-js/babel-preset/node'),
      {
        pluginDecorators: {
          version: 'legacy',
        },
      },
    ],
    [
      require.resolve('@babel/preset-react'),
      {
        runtime: isNewJsx ? 'automatic' : 'classic',
      },
    ],
  ],
  configFile: false,
  babelrc: false,
});

export default babelTransformer;
