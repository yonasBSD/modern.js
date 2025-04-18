import type { Buffer } from 'buffer';
import type { AppTools, AppToolsHooks, CliPlugin } from '@modern-js/app-tools';
import type { BaseHooks } from '@modern-js/core';
import type {
  DevtoolsContext,
  ServerManifest,
} from '@modern-js/devtools-kit/node';
import type { ServerPluginLegacy, ToThreads } from '@modern-js/server-core';
import type { RsbuildPluginAPI } from '@rsbuild/core';
import type { Hookable } from 'hookable';

export type CliPluginAPI = Parameters<
  NonNullable<CliPlugin<AppTools>['setup']>
>[0];

export type ServerPluginAPI = Parameters<
  NonNullable<ServerPluginLegacy['setup']>
>[0];

export type BufferLike =
  | string
  | Buffer
  | DataView
  | number
  | ArrayBufferView
  | Uint8Array
  | ArrayBuffer
  | SharedArrayBuffer
  | ReadonlyArray<any>
  | ReadonlyArray<number>
  | { valueOf: () => ArrayBuffer }
  | { valueOf: () => SharedArrayBuffer }
  | { valueOf: () => Uint8Array }
  | { valueOf: () => ReadonlyArray<number> }
  | { valueOf: () => string }
  | { [Symbol.toPrimitive]: (hint: string) => string };

export type CleanHooks<T> = {
  [K in keyof T]: T[K] extends (...args: [...infer Params]) => any
    ? (...args: [...Params]) => void
    : never;
};

export type $FrameworkHooks = CleanHooks<
  Pick<
    ToThreads<BaseHooks<any> & AppToolsHooks<any>>,
    | 'prepare'
    | 'modifyFileSystemRoutes'
    | 'modifyServerRoutes'
    | 'afterCreateCompiler'
    | 'afterDev'
    | 'beforeRestart'
    | 'beforeExit'
    | 'afterBuild'
  >
>;

export interface FrameworkHooks extends $FrameworkHooks {
  config: () => void;
  setup: (api: CliPluginAPI) => void;
}

type UnwrapBuilderHooks<T> = {
  [K in keyof T]: T[K] extends (...args: any) => any
    ? (...params: [...Parameters<Parameters<T[K]>[0]>]) => void
    : never;
};

export type $BuilderHooks = UnwrapBuilderHooks<
  Pick<
    RsbuildPluginAPI,
    | 'modifyBundlerChain'
    | 'modifyWebpackConfig'
    | 'modifyRspackConfig'
    | 'onBeforeCreateCompiler'
    | 'onAfterCreateCompiler'
    | 'onDevCompileDone'
    | 'onAfterBuild'
    | 'onExit'
  >
>;

export interface BuilderHooks extends $BuilderHooks {
  setup: (api: RsbuildPluginAPI) => void;
}

export interface DevtoolsHooks {
  cleanup: () => Promise<void> | void;
  settleState: () => Promise<void> | void;
  createManifest: (arg: { manifest: ServerManifest }) => Promise<void> | void;
}

declare global {
  interface DevtoolsPluginVars extends Record<string, unknown> {}
}

export interface PluginApi {
  builderHooks: Hookable<BuilderHooks>;
  frameworkHooks: Hookable<FrameworkHooks>;
  hooks: Hookable<DevtoolsHooks>;
  setupFramework: () => Promise<CliPluginAPI>;
  setupBuilder: () => Promise<RsbuildPluginAPI>;
  context: DevtoolsContext;
  vars: DevtoolsPluginVars;
}

export interface Plugin {
  name: string;
  setup: (api: PluginApi) => Promise<void>;
}
