import path from 'path';
import { expect, test } from '@modern-js/e2e/playwright';
import { pluginSwc } from '@rsbuild/plugin-webpack-swc';
import { build } from '@scripts/shared';
import { cases, copyPkgToNodeModules, findEntry, shareTest } from './helper';

/* webpack can receive Function type configuration */
test('should import with function customName', async () => {
  copyPkgToNodeModules();

  const setupConfig = {
    cwd: __dirname,
    entry: { index: path.resolve(__dirname, './src/index.js') },
  };

  {
    const builder = await build({
      ...setupConfig,
      builderConfig: {
        source: {
          transformImport: [
            {
              libraryName: 'foo',
              customName: (member: string) => `foo/lib/${member}`,
            },
          ],
        },
      },
    });
    const files = await builder.unwrapOutputJSON(false);
    const entry = findEntry(files);
    expect(files[entry]).toContain('transformImport test succeed');
  }

  const builder = await build({
    ...setupConfig,
    plugins: [pluginSwc()],
    builderConfig: {
      source: {
        transformImport: [
          {
            libraryName: 'foo',
            customName: (member: string) => `foo/lib/${member}`,
          },
        ],

        // @ts-expect-error rspack and webpack all support this
        disableDefaultEntries: true,
        entries: {
          index: './src/index.js',
        },
      },
    },
  });
  const files = await builder.unwrapOutputJSON(false);
  const entry = findEntry(files);
  expect(files[entry]).toContain('transformImport test succeed');
});

test('should import with template config with SWC', async () => {
  copyPkgToNodeModules();

  const setupConfig = {
    cwd: __dirname,
    entry: { index: path.resolve(__dirname, './src/index.js') },
    plugins: [pluginSwc()],
  };

  {
    const builder = await build({
      ...setupConfig,
      builderConfig: {
        source: {
          transformImport: [
            {
              libraryName: 'foo',
              customName: 'foo/lib/{{ member }}',
            },
          ],
        },
      },
    });
    const files = await builder.unwrapOutputJSON(false);
    const entry = findEntry(files);
    expect(files[entry]).toContain('transformImport test succeed');
  }

  {
    const builder = await build({
      ...setupConfig,
      builderConfig: {
        source: {
          transformImport: [
            {
              libraryName: 'foo',
              customName: member => `foo/lib/${member}`,
            },
          ],
        },
      },
    });
    const files = await builder.unwrapOutputJSON(false);
    const entry = findEntry(files);
    expect(files[entry]).toContain('transformImport test succeed');
  }
});

cases.forEach(c => {
  const [name, entry, config] = c;
  shareTest(`${name}-webpack`, entry, config);

  shareTest(`${name}-webpack-swc`, entry, config, {
    plugins: [pluginSwc()],
  });
});
