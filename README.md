[TOC]

# 用Babel解析AST去除控制流平坦化（含IDEA配置eslint踩坑记录）

### 依赖

- Windows10、IDEA

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

希望实现：在项目根目录输入命令`npm run cff <fname>`，自动执行`tsc && node src/<fname>.js`。

这方面资料少得可怜，参考链接1已经是能找到的里面最好的了。

根据参考链接1，尝试过在`package.json`里加`fname`属性，然后读取`%npm_package_fname%`，但发现读不到值，因为必须放到`package.json`的`config`属性里；也尝试过在`package.json`的`config`对象里加自定义属性`fname`，这次`%npm_package_fname%`能读到值但无法修改。于是我们只能用nodejs写个脚本，然后用npm scripts包装一下了。

放在项目根目录下的`cff.js`：

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

运行举例：

```bash
npm run cff check_pass_demo
```

给一个`src/check_pass_demo.ts`最简单的代码：

```ts
import fs from 'fs';

function getFile (path: string) {
  return fs.readFileSync(path, 'utf-8');
}

const jsCode = getFile('src/inputs/check_pass_demo.js'); // 运行者不是自己，所以要相对于项目根目录
console.log(jsCode.substring(0, 60));
```

### 先来解析一个简单的demo

这个demo来自参考链接4。待解析文件`src/inputs/hw.js`：

```js
var arr = '3,0,1,2,4'.split(',');
var x = 0;
var cnt = 0;
while (true) {
  switch (arr[cnt++]) {
    case '0':
      console.log('case 0');
      x += 5;
      continue;
    case '1':
      console.log('case 1');
      x += 4;
      continue;
    case '2':
      console.log('case 2');
      x += 3;
      continue;
    case '3':
      console.log('case 3');
      x += 2;
      continue;
    case '4':
      console.log('case 4');
      x += 1;
      continue;

  }
  break;
}
```

#### 思路

1. 获取`arr`运行时的值（是个定值）。
2. 用Babel读取每一个`case`的body，具体取哪个`case`用`arr`确定。这里的body是`Statement[]`。
3. 把上面的所有body拼接起来，得所求，类型仍为`Statement[]`。调用`path.replaceInline(Statement[])`来获取去除控制流平坦化的代码。

`src/hw.ts`的大多数代码都只是做第一步，因为考虑到源代码可能会变。也可以选择直接硬编码第一步的结果。因此代码的骨架如下：

```ts
const jsCode = getFile('src/inputs/hw.js');
const ast = parser.parse(jsCode);
const decodeWhileOpts = {
  WhileStatement (path: NodePath<WhileStatement>) {
    const { body } = path.node;
    const swithchNode = (body as BlockStatement).body[0];
    if (!isSwitchStatement(swithchNode)) return;
    const { discriminant, cases } = swithchNode;
    // 省略第一步的代码...
    const replaceBody = arrVal.reduce((replaceBody, index) => {
      const caseBody = cases[+index].consequent;
      if (isContinueStatement(caseBody[caseBody.length - 1])) {
        caseBody.pop();
      }
      return replaceBody.concat(caseBody);
    }, [] as Statement[]);
    path.replaceInline(replaceBody);
  }
};
traverse(ast, decodeWhileOpts);
const { code } = generator(ast);
writeOutputToFile('hw_out.js', code);
```

这里偷懒了一下，直接用`cases[+index]`来取具体的`case`了，实际上很可能要获取`cases[index].test.value`。

完整代码看`src/hw.ts`即可。注意：

1. 我们在项目根目录用`npm run cff hw`来运行`src/hw.ts`，所以读写文件要相对于项目根目录。

#### 写这类代码的套路

我们需要不停地观看 https://astexplorer.net/ 给出的AST，来调整代码。另外，这里使用TS看上去是自讨苦吃，实际上写类型守卫的过程是在倒逼自己去思考各种边界情况。

### Babel还原不直观的编码字符串或数值

参考链接6。`translate_literal.ts`：

```ts
import traverse from '@babel/traverse';
import { stringLiteral, Node } from '@babel/types';

export function translateLiteral (ast: Node) {
  traverse(ast, {
    NumericLiteral (path) {
      const node = path.node;
      // 直接去除node.extra即可
      if (node.extra && /^0[obx]/i.test(node.extra.raw as string)) {
        node.extra = undefined;
      }
    },
    StringLiteral (path) {
      const node = path.node;
      if (node.extra && /\\[ux]/gi.test(node.extra.raw as string)) {
        let nodeValue = '';
        try {
          nodeValue = decodeURIComponent(escape(node.value));
        } catch (error) {
          nodeValue = node.value;
        }
        path.replaceWith(stringLiteral(nodeValue));
        path.node.extra = {
          'raw': JSON.stringify(nodeValue),
          'rawValue': nodeValue
        };
      }
    }
  });
}

// 调用：translateLiteral(ast);
```

### Babel实现变量重命名

注意：对于全局变量与局部变量同名的情况，这段代码可能是有问题的。

```ts
import traverse, { NodePath } from '@babel/traverse';
import { Identifier, Node } from '@babel/types';

// 对于全局变量与局部变量同名的情况，这段代码可能是有问题的
export function renameVars (
  ast: Node,
  canReplace: (name: string) => boolean = () => {return true;},
  renameMap: {[key: string]: string} = {}
) {
  const names = new Set<string>();
  traverse(ast, {
    Identifier (path: NodePath<Identifier>) {
      const oldName = path.node.name;
      if (!canReplace(oldName)) return;
      names.add(oldName);
    }
  });
  let i = 0;
  names.forEach((name) => {
    if (!Object.getOwnPropertyDescriptor(renameMap, name)) {
      renameMap[name] = `v${++i}`;
    }
  });
  traverse(ast, {
    Identifier (path: NodePath<Identifier>) {
      const oldName = path.node.name;
      if (!canReplace(oldName)) return;
      path.node.name = renameMap[oldName];
    }
  });
}
```

### Babel MemberExpression Array Notation转Dot Notation

```ts
import traverse, { NodePath } from '@babel/traverse';
import { identifier, Node, MemberExpression } from '@babel/types';

// console['log']() 变 console.log()
// computed 属性如果为 false，是表示 . 来引用成员
// computed 属性为 true，则是 [] 来引用成员
export function memberExpComputedToFalse (ast: Node) {
  traverse(ast, {
    MemberExpression (path: NodePath<MemberExpression>) {
      // path.get('property')获取到的是一个NodePath类型
      const propertyPath = path.get('property');
      if (!propertyPath.isStringLiteral()) return;
      const val = propertyPath.node.value;
      path.node.computed = false;
      propertyPath.replaceWith(identifier(val));
    }
  });
}
```

### 参考资料

1. npm package.json scripts 传递参数的解决方案：https://juejin.cn/post/7032919800662016031
2. node执行shell命令：https://www.jianshu.com/p/c0d31513953a
3. IDEA配置eslint：https://blog.csdn.net/weixin_33850015/article/details/91369049
4. 利用AST对抗js混淆(三) 控制流平坦化(Control Flow Flattening)的处理：https://blog.csdn.net/lacoucou/article/details/113665767
5. Babel AST节点介绍：https://www.jianshu.com/p/4f27f4aa576f