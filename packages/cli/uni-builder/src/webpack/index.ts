import {
  type RsbuildConfig,
  type RsbuildInstance,
  type RsbuildPlugin,
  createRsbuild,
} from '@rsbuild/core';
import { compatLegacyPlugin } from '../shared/compatLegacyPlugin';
import { parseCommonConfig } from '../shared/parseCommonConfig';
import { SERVICE_WORKER_ENVIRONMENT_NAME } from '../shared/utils';
import type {
  CreateBuilderCommonOptions,
  CreateUniBuilderOptions,
  OverridesUniBuilderInstance,
  UniBuilderConfig,
} from '../types';
import { pluginBabel } from './plugins/babel';
import { pluginModuleScopes } from './plugins/moduleScopes';
import { pluginReact } from './plugins/react';

export async function parseConfig(
  uniBuilderConfig: UniBuilderConfig,
  options: CreateBuilderCommonOptions,
): Promise<{
  rsbuildConfig: RsbuildConfig;
  rsbuildPlugins: RsbuildPlugin[];
}> {
  const { rsbuildConfig, rsbuildPlugins } = await parseCommonConfig(
    uniBuilderConfig,
    options,
  );

  rsbuildPlugins.push(
    pluginBabel(
      {
        babelLoaderOptions: uniBuilderConfig.tools?.babel,
      },
      {
        transformLodash: uniBuilderConfig.performance?.transformLodash ?? true,
      },
    ),
  );
  rsbuildPlugins.push(pluginReact());

  if (uniBuilderConfig.tools?.tsLoader) {
    const { pluginTsLoader } = await import('./plugins/tsLoader');
    rsbuildPlugins.push(
      pluginTsLoader(
        uniBuilderConfig.tools.tsLoader,
        uniBuilderConfig.tools.babel,
      ),
    );
  }

  if (!uniBuilderConfig.output?.disableMinimize) {
    const { pluginMinimize } = await import('./plugins/minimize');
    rsbuildPlugins.push(pluginMinimize(uniBuilderConfig.tools?.terser));
  }

  if (uniBuilderConfig.security?.sri) {
    const { pluginSRI } = await import('./plugins/sri');
    rsbuildPlugins.push(pluginSRI(uniBuilderConfig.security?.sri));
  }

  if (uniBuilderConfig.experiments?.lazyCompilation) {
    const { pluginLazyCompilation } = await import('./plugins/lazyCompilation');
    rsbuildPlugins.push(
      pluginLazyCompilation(uniBuilderConfig.experiments?.lazyCompilation),
    );
  }

  if (uniBuilderConfig.tools?.styledComponents !== false) {
    const { pluginStyledComponents } = await import(
      './plugins/styledComponents'
    );
    const options = uniBuilderConfig.tools?.styledComponents || {};
    if (uniBuilderConfig.environments?.[SERVICE_WORKER_ENVIRONMENT_NAME]) {
      options.ssr = true;
    }

    rsbuildPlugins.push(pluginStyledComponents(options));
  }

  return {
    rsbuildConfig,
    rsbuildPlugins,
  };
}

export type UniBuilderWebpackInstance = Omit<
  RsbuildInstance,
  keyof OverridesUniBuilderInstance
> &
  OverridesUniBuilderInstance;

export async function createWebpackBuilder(
  options: CreateUniBuilderOptions,
): Promise<UniBuilderWebpackInstance> {
  const { cwd = process.cwd(), config, ...rest } = options;

  const { rsbuildConfig, rsbuildPlugins } = await parseConfig(config, {
    ...rest,
    cwd,
  });

  const { webpackProvider } = await import('@rsbuild/webpack');
  const {
    __internalHelper: { setHTMLPlugin },
  } = await import('@rsbuild/core');

  const { default: HtmlWebpackPlugin } = await import('html-webpack-plugin');

  // Some third-party plug-ins depend on html-webpack-plugin, like sri
  // @ts-expect-error compilation type mismatch
  setHTMLPlugin(HtmlWebpackPlugin);

  rsbuildConfig.provider = webpackProvider;

  const rsbuild = await createRsbuild({
    rsbuildConfig,
    cwd,
  });

  rsbuild.addPlugins([
    ...rsbuildPlugins,
    pluginModuleScopes(options.config.source?.moduleScopes),
  ]);

  return {
    ...rsbuild,
    addPlugins: (plugins, options) => {
      const warpedPlugins = plugins.map(plugin => {
        return compatLegacyPlugin(plugin, { cwd });
      });
      rsbuild.addPlugins(warpedPlugins, options);
    },
  };
}
