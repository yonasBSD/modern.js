import type { Rspack } from '@modern-js/builder';

export class BottomTemplatePlugin {
  htmlWebpackPlugin: typeof Rspack.HtmlRspackPlugin;

  bottomTemplateReg: RegExp = /<!--<\?-\s*bottomTemplate\s*\?>-->/;

  bodyRegExp: RegExp = /(<\/\s*body\s*>)/i;

  name: string;

  constructor(htmlWebpackPlugin: typeof Rspack.HtmlRspackPlugin) {
    this.htmlWebpackPlugin = htmlWebpackPlugin;
    this.name = 'bottom-template';
  }

  apply(compiler: Rspack.Compiler) {
    compiler.hooks.compilation.tap(this.name, compilation => {
      this.htmlWebpackPlugin
        .getHooks(compilation as any)
        .beforeEmit.tap(this.name, data => {
          if (!data.plugin.options?.__internal__) {
            return data;
          }
          // 含有 <!--<?- bottomTemplate ?>--> 占位符时才需要注入 bottom.html
          if (this.bottomTemplateReg.test(data.html)) {
            // 清空占位符
            data.html = data.html.replace(this.bottomTemplateReg, '');
            const { bottomTemplate } = data.plugin.options;
            if (bottomTemplate) {
              data.html = data.html.replace(
                this.bodyRegExp,
                match => `\n${bottomTemplate}\n${match}`,
              );
            }
          }
          return data;
        });
    });
  }
}
