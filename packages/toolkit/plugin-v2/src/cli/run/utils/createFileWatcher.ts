import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { chokidar, createDebugger, isDevCommand } from '@modern-js/utils';
import type { InternalContext } from '../../../types';
import type { CLIPluginExtends } from '../../../types/cli/plugin';

const debug = createDebugger('watch-files');

const hashMap = new Map<string, string>();

const md5 = (data: string) =>
  crypto.createHash('md5').update(data).digest('hex');

export const createFileWatcher = async <Extends extends CLIPluginExtends>(
  appContext: InternalContext<Extends>,
) => {
  // only add fs watcher on dev mode.
  if (isDevCommand()) {
    const { appDirectory } = appContext;
    const extraFiles = await appContext.hooks.addWatchFiles.call();
    const watched = extraFiles
      .filter((extra): extra is string[] => {
        return Array.isArray(extra);
      })
      .flat();
    const privateWatched = extraFiles
      .filter((extra): extra is { files: string[]; isPrivate: boolean } => {
        return !Array.isArray(extra) && extra.isPrivate;
      })
      .map(extra => {
        return extra.files;
      })
      .flat();

    const isPrivate = (filename: string) =>
      privateWatched.some(ff => {
        return path.resolve(appDirectory, filename).startsWith(ff);
      });

    debug(`watched: %o`, watched);
    const watcher = chokidar.watch([...watched, ...privateWatched], {
      cwd: appDirectory,
      ignoreInitial: true,
      ignorePermissionErrors: true,
      ignored: [
        '**/__test__/**',
        '**/*.test.(js|jsx|ts|tsx)',
        '**/*.spec.(js|jsx|ts|tsx)',
        '**/*.stories.(js|jsx|ts|tsx)',
      ],
    });

    watcher.on('change', changed => {
      const lastHash = hashMap.get(changed);
      const currentHash = md5(
        fs.readFileSync(path.join(appDirectory, changed), 'utf8'),
      );
      if (currentHash !== lastHash) {
        debug(`file change: %s`, changed);
        hashMap.set(changed, currentHash);
        appContext.hooks.onFileChanged.call({
          filename: changed,
          eventType: 'change',
          isPrivate: isPrivate(changed),
        });
      }
    });

    watcher.on('add', changed => {
      debug(`add file: %s`, changed);
      const currentHash = md5(
        fs.readFileSync(path.join(appDirectory, changed), 'utf8'),
      );
      hashMap.set(changed, currentHash);
      appContext.hooks.onFileChanged.call({
        filename: changed,
        eventType: 'add',
        isPrivate: isPrivate(changed),
      });
    });

    watcher.on('unlink', changed => {
      debug(`remove file: %s`, changed);
      if (hashMap.has(changed)) {
        hashMap.delete(changed);
      }
      appContext.hooks.onFileChanged.call({
        filename: changed,
        eventType: 'unlink',
        isPrivate: isPrivate(changed),
      });
    });

    watcher.on('error', err => {
      throw err;
    });
    return watcher;
  }
};
