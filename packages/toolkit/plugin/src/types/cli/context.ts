import type { BuilderInstance } from '@modern-js/builder';
import type { ServerRoute } from '@modern-js/types';
import type { Hooks } from '../../cli/hooks';
import type { CLIPluginAPI } from './api';
import type { CLIPlugin, CLIPluginExtends } from './plugin';

export interface Entrypoint {
  isMainEntry?: boolean;
  entryName: string;
  entry: string;
}

/** The public context */
export type AppContext<Extends extends CLIPluginExtends> = {
  // current framework meta name
  metaName: string;
  // current project package name
  packageName: string;
  // current config file absolute path
  configFile: string;
  // current command name
  command: string;
  // is prod mode
  isProd: boolean;
  // project root path
  appDirectory: string;
  // project src code path
  srcDirectory: string;
  // project output path, this value will be set after api.modifyResolvedConfig
  distDirectory: string;
  // node_modules path
  nodeModulesDirectory: string;
  // cli plugins list
  plugins: CLIPlugin<Extends>[];
  // bundler type
  bundlerType?: 'rspack';
  // bundler instance
  builder?: BuilderInstance;
  // current server port
  port?: number;
  // current server host name
  host?: string;
  // current server ip address
  ip?: string;
  // server routes
  serverRoutes?: ServerRoute[];
};

/** The inner context. */
export type InternalContext<Extends extends CLIPluginExtends> =
  AppContext<Extends> & {
    /** All hooks. */
    hooks: Hooks<
      Extends['config'],
      Extends['normalizedConfig'],
      Extends['extendBuildUtils'],
      Extends['extendConfigUtils']
    > &
      Extends['extendHooks'];
    /** All plugin registry hooks */
    extendsHooks: Extends['extendHooks'];
    /** Current App config. */
    config: Readonly<Extends['config']>;
    /** The normalized Rsbuild config. */
    normalizedConfig?: Extends['normalizedConfig'];
    pluginAPI?: CLIPluginAPI<Extends> & Record<string, (...args: any[]) => any>;
    _internalContext?: InternalContext<Extends>;
  };
