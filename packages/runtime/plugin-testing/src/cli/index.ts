import path from 'path';
import type { CliPlugin } from '@modern-js/core';
import {
  createRuntimeExportsUtils,
  isApiOnly,
  mergeAlias,
} from '@modern-js/utils';
import {
  DEFAULT_RESOLVER_PATH,
  type TestConfigOperator,
  getModuleNameMapper,
  testingHooks,
} from '../base';
import type { UserConfig } from '../base/config';
import type { Hooks } from '../base/hook';
import { MODERNJS_CONFIG_KEY } from '../constant';
import { testingBffPlugin } from './bff';
import test from './test';

export const mergeUserJestConfig = (testUtils: TestConfigOperator) => {
  const resolveJestConfig = testUtils.testConfig.jest;

  // resolveJestConfig 如果是函数类型，在所有测试插件 jestConfig 都执行后，再执行生成最终配置
  if (resolveJestConfig && typeof resolveJestConfig !== 'function') {
    testUtils.mergeJestConfig(resolveJestConfig);
  }
};

export const getJestTransformEsModulesRegStr = () => {
  const esmModulesInPnpm = [
    '@modern-js\\+runtime@',
    '@modern-js\\+plugin@',
    // @modern-js-reduck+store, @modern-js-reduck+effects and so on
    '@modern-js-reduck',
    '@babel\\+runtime@',
  ];
  // yarn or npm
  const esmModules = [
    '@modern-js/runtime',
    '@modern-js/plugin',
    '@modern-js-reduck',
    '@babel/runtime',
  ];
  return `node_modules/(?!(\\.pnpm/(${esmModulesInPnpm.join(
    '|',
  )}))|(${esmModules.join('|')}))`;
};

export const testingPlugin = (): CliPlugin<{
  hooks: Hooks;
  userConfig: UserConfig;
  normalizedConfig: Required<UserConfig>;
}> => {
  const bffPlugin = testingBffPlugin();

  return {
    name: '@modern-js/plugin-testing',

    usePlugins: [bffPlugin],

    post: [bffPlugin.name!],

    registerHook: testingHooks,

    setup: api => {
      let testingExportsUtils: ReturnType<typeof createRuntimeExportsUtils>;

      return {
        commands: ({ program }: any) => {
          program
            .command('test')
            .option(
              '-u --updateSnapshot',
              'use this flag to re-record snapshots',
            )
            .option(
              '--watch',
              'watch files for changes and rerun tests related to changed files',
            )
            .allowUnknownOption()
            .usage('<regexForTestFiles> --[options]')
            .action(async () => {
              await test(api);
            });
        },
        config() {
          const appContext = api.useAppContext();

          testingExportsUtils = createRuntimeExportsUtils(
            appContext.internalDirectory,
            'testing',
          );

          return {
            resolve: {
              alias: {
                // The module-tools alias configuration is different and more specific than app-tools.
                // So for the time being, the @ alias is configured here.
                '@': path.join(appContext.appDirectory, 'src'),
                '@modern-js/runtime/testing/bff': require.resolve(
                  '@modern-js/plugin-testing/bff',
                ),
                '@modern-js/runtime/testing': testingExportsUtils.getPath(),
              },
            },
          };
        },

        addRuntimeExports() {
          const testingPath = path.resolve(__dirname, '../');
          testingExportsUtils.addExport(`export * from '${testingPath}'`);
        },

        jestConfig: async (utils, next) => {
          const appContext = api.useAppContext();
          const userConfig = api.useResolvedConfigContext();

          const apiOnly = await isApiOnly(appContext.appDirectory);

          if (apiOnly) {
            return next(utils);
          }

          const alias = mergeAlias(userConfig.resolve?.alias || {});

          if (testingExportsUtils) {
            alias['@modern-js/runtime/testing'] = [
              testingExportsUtils.getPath(),
            ];
          }

          utils.mergeJestConfig({
            globals: {
              [MODERNJS_CONFIG_KEY]: userConfig,
            },
            moduleNameMapper: getModuleNameMapper(alias),
            testEnvironment: 'jsdom',
            resolver: DEFAULT_RESOLVER_PATH,
            rootDir: appContext.appDirectory || process.cwd(),
            // testMatch bug on windows, issue: https://github.com/facebook/jest/issues/7914
            testMatch: [
              `<rootDir>/src/**/*.test.[jt]s?(x)`,
              `<rootDir>/tests/**/*.test.[jt]s?(x)`,
            ],
            transformIgnorePatterns: [getJestTransformEsModulesRegStr()],
          });

          mergeUserJestConfig(utils);

          return next(utils);
        },
      };
    },
  };
};

export default testingPlugin;
