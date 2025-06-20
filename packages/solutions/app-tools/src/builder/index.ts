export async function createBuilderGenerator(bundler: 'webpack' | 'rspack') {
  if (bundler === 'rspack') {
    const { createRspackBuilderForModern } = await import(
      './builder-rspack/index.js'
    );
    return createRspackBuilderForModern;
  }

  const { createWebpackBuilderForModern } = await import(
    './builder-webpack/index.js'
  );
  return createWebpackBuilderForModern;
}

export { parseRspackConfig } from '@modern-js/uni-builder';

export {
  builderPluginAdapterBasic,
  builderPluginAdapterHooks,
} from './shared/builderPlugins';
