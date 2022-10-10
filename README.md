[TOC]

### 依赖

```bash
yarn add shelljs -D
# 如果有现成的package.json，只运行这个就行
yarn
```

### IDEA配置eslint

每次配置eslint，eslint都有新的方式来折磨我，我愿称之为yyds。

#### eslint报错：TypeError: this.options.parse is not a function

首先，IDEA配置的eslint不要大于等于**`8.23.0`**，否则你会遇到这个错误：

```
TypeError: this.options.parse is not a function
```

那么我们的`package.json`得这么写：`"eslint": "8.22.0"`。

#### eslint报cliEngine的错

打开`<idea安装目录>\plugins\JavaScriptLanguage\languageService\eslint\bin\eslint-plugin.js`。

```js
// 旧版用
this.cliEngine = require(this.basicPath + "lib/cli-engine");
// 新版用
this.cliEngine = require(this.basicPath + "lib/cli-engine").CLIEngine;
```

当然有兼容的写法：`?.`即可，但es2020很可能不支持，自己polyfill一下就行。

#### IDEA配置自动format

`yarn add`之后，是根据参考链接3来配置：

1. `Languages & Frameworks -> JavaScript -> Code Quality Tools -> ESLint`，勾选Enable，然后填相关的字段。
2. `设置 -> ESLint Settings`，勾选Enable，然后填`Path to eslint bin`，勾选`Auto fix errors`等字段。
3. 打开`设置 -> Keymap`搜索`Fix ESLint Problems`，配置快捷键。

看到它标红，并且能按快捷键修复就成功了。总之能配置的都配置一下，免得它老不生效……

> 呵呵呵这次IDEA叕不能显示typescript的eslint错误了，明明啥都装了……不得不说**eslint永远得神**……

### 动态指定执行命令：用npm scripts+nodejs脚本解决

希望实现：输入命令`npm run cff <fname>`，自动执行`tsc && node <fname>.js`。

这方面资料少得可怜，参考链接1已经是能找到的里面最好的了。

根据参考链接1，尝试过在`package.json`里加`fname`属性，然后读取`%npm_package_fname%`，但发现读不到值，因为必须放到`package.json`的`config`属性里；也尝试过在`package.json`的`config`对象里加自定义属性`fname`，这次`%npm_package_fname%`能读到值但无法修改。于是我们只能用nodejs写个脚本，然后用npm scripts包装一下了。

`cff.js`：

```js
const process = require('process');
const shell = require('shelljs');

const args = process.argv.slice(2);
if (!args.length) {
  console.log('Usage: npm run cff <file_name>');
  process.exit(0);
}
const fname = args[0];
shell.exec(`tsc && node src/${fname}.js`);
```

依赖：

```bash
yarn add shelljs -D
```



### 参考资料

1. npm package.json scripts 传递参数的解决方案：https://juejin.cn/post/7032919800662016031
2. node执行shell命令：https://www.jianshu.com/p/c0d31513953a
3. IDEA配置eslint：https://blog.csdn.net/weixin_33850015/article/details/91369049