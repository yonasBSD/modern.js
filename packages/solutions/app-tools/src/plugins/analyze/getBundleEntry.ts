import path from 'path';
import type { Entrypoint } from '@modern-js/types';
import {
  fs,
  JS_EXTENSIONS,
  MAIN_ENTRY_NAME,
  ensureAbsolutePath,
  findExists,
} from '@modern-js/utils';
import type { AppNormalizedConfig } from '../../types';
import type { AppToolsContext, AppToolsHooks } from '../../types/plugin';
import { getFileSystemEntry } from './getFileSystemEntry';
import { isSubDirOrEqual } from './utils';

const ensureExtensions = (file: string) => {
  if (!path.extname(file)) {
    return findExists(JS_EXTENSIONS.map(ext => `${file}${ext}`)) || file;
  }
  return file;
};

/**
 *
 * Lightweight method for whether it is a directory.
 */
const isDirectory = (file: string) => !path.extname(file);

const ifAlreadyExists = (
  entrypoints: Entrypoint[],
  checked: Entrypoint,
): boolean =>
  entrypoints.some(entrypoint => {
    if (
      ensureExtensions(entrypoint.entry) === ensureExtensions(checked.entry)
    ) {
      // reset entryName
      checked.entryName = entrypoint.entryName;
      return true;
    }
    // filesystem routes entrypoint conflict with normal entrypoint.
    if (
      isSubDirOrEqual(entrypoint.entry, checked.entry) ||
      isSubDirOrEqual(checked.entry, entrypoint.entry)
    ) {
      throw new Error(
        `Entry configuration conflicts\n Your configuration: ${checked.entry}.\n Default entrypoint: ${entrypoint.entry}\n Please reset source.entries or set source.disableDefaultEntries to disable the default entry rules.`,
      );
    }

    return false;
  });

export const getBundleEntry = async (
  hooks: AppToolsHooks,
  appContext: AppToolsContext,
  config: AppNormalizedConfig,
) => {
  const { appDirectory, packageName } = appContext;
  const { disableDefaultEntries, entries, entriesDir, mainEntryName } =
    config.source;

  const defaults = disableDefaultEntries
    ? []
    : await getFileSystemEntry(hooks, appContext, config);

  // merge entrypoints from user config with directory convention.
  if (entries) {
    Object.keys(entries).forEach(name => {
      const value = entries[name];
      const entryName = typeof value === 'string' ? value : value.entry;
      const isAutoMount =
        typeof value === 'string' ? true : !value.disableMount;
      const entrypoint: Entrypoint = {
        entryName: name,
        isMainEntry: false,
        entry: ensureAbsolutePath(appDirectory, entryName),
        absoluteEntryDir: isDirectory(
          ensureAbsolutePath(appDirectory, entryName),
        )
          ? ensureAbsolutePath(appDirectory, entryName)
          : path.dirname(ensureAbsolutePath(appDirectory, entryName)),
        isAutoMount,
        fileSystemRoutes: fs
          .statSync(ensureAbsolutePath(appDirectory, entryName))
          .isDirectory()
          ? {}
          : undefined,
        isCustomSourceEntry: true,
      };

      if (!ifAlreadyExists(defaults, entrypoint)) {
        defaults.push(entrypoint);
      }
    });
  }

  if (!disableDefaultEntries) {
    // find main entry point which server route is '/'.
    const entriesDirAbs = ensureAbsolutePath(appDirectory, entriesDir || '');
    const found = defaults.find(
      ({ entryName, entry, nestedRoutesEntry = '' }) =>
        entryName === packageName ||
        path.dirname(entry) === entriesDirAbs ||
        path.dirname(nestedRoutesEntry) === entriesDirAbs,
    );
    if (found) {
      found.entryName = mainEntryName || MAIN_ENTRY_NAME;
      found.isMainEntry = true;
    }
  }
  return defaults;
};
