import type { SSGMultiEntryOptions } from '@modern-js/types';
import { MAIN_ENTRY_NAME } from '../constants';
import { isEmpty } from './type';

interface EntryPoint {
  entryName: string;
}

/**
 * Is SSR project
 *
 * @param config - User config.
 * @returns Whether to use server side render.
 */
export const isSSR = (config: any): boolean => {
  const { server } = config;

  if (server?.ssr) {
    return true;
  }

  if (server?.ssrByEntries && !isEmpty(server.ssrByEntries)) {
    for (const name of Object.keys(server.ssrByEntries)) {
      if (server.ssrByEntries[name]) {
        return true;
      }
    }
  }

  return false;
};

export const isUseSSRBundle = (config: any): boolean => {
  const { output } = config;
  if (output?.ssg) {
    return true;
  }

  return isSSR(config);
};

export const isUseRsc = (config: any): boolean => {
  return config?.server?.rsc;
};

/**
 * Is Worker project
 *
 * @param config - User config.
 * @returns Whether to use worker deploy.
 */
export const isServiceWorker = (config: any): boolean => {
  const { output, deploy } = config;

  if (deploy?.worker?.ssr && (output?.ssg || isSSR(config))) {
    return true;
  }

  return false;
};

export const isSSGEntry = (
  config: any,
  entryName: string,
  entrypoints: EntryPoint[],
) => {
  const ssgConfig = config.output.ssg;
  const useSSG = isSingleEntry(entrypoints, config.source?.mainEntryName)
    ? Boolean(ssgConfig)
    : ssgConfig === true ||
      typeof (ssgConfig as Array<unknown>)?.[0] === 'function' ||
      Boolean((ssgConfig as SSGMultiEntryOptions)?.[entryName]);

  return useSSG;
};

export const isSingleEntry = (
  entrypoints: EntryPoint[],
  mainEntryName = MAIN_ENTRY_NAME,
) => entrypoints.length === 1 && entrypoints[0].entryName === mainEntryName;
