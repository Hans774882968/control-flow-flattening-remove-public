[TOC]

# 用Babel解析AST处理OB混淆JS代码：去除控制流平坦化、处理常量串隐藏、MemberExpression Array Notation转Dot Notation……

## 用Babel解析AST处理OB混淆JS代码（一）：搭环境（含IDEA配置eslint踩坑记录）

### 依赖

- Windows10、IDEA、yarn

```bash
yarn add shelljs -D
# 如果有现成的package.json，只运行这个就行
yarn
```

`package.json`指定的**主要**依赖如下：

```json
  "devDependencies": {
    "@babel/preset-typescript": "^7.18.6",
    "@types/babel__core": "^7.1.19",
    "@types/babel__traverse": "^7.18.0",
    "@types/node": "^18.7.13",
    "@typescript-eslint/eslint-plugin": "^5.35.1",
    "@typescript-eslint/parser": "^5.35.1",
    "eslint": "8.22.0",
    "shelljs": "^0.8.5"
  },
  "dependencies": {
    "@babel/core": "^7.18.13",
    "@babel/parser": "^7.18.13",
    "@babel/preset-env": "^7.18.10",
    "@babel/traverse": "^7.18.13",
    "ts-node": "^10.9.1",
    "typescript": "^4.7.4"
  }
```

【52pojie】用Babel解析AST处理OB混淆JS代码：https://www.52pojie.cn/thread-1700036-1-1.html

本系列所有代码都基于GitHub仓库：https://github.com/Hans774882968/control-flow-flattening-remove-public

**作者：[hans774882968](https://blog.csdn.net/hans774882968)以及[hans774882968](https://juejin.cn/user/1464964842528888)以及[hans774882968](https://www.52pojie.cn/home.php?mod=space&uid=1906177)**

### 引言

> AST（Abstract Syntax Tree，抽象语法树），简称语法树（Syntax Tree），是源代码的抽象语法结构的树状表现形式，树上的每个节点都表示源代码中的一种结构。语法树不是某一种编程语言独有的，JavaScript、Python、Java、Golang等几乎所有编程语言都有语法树。

AST 的用途很广：IDE 的语法高亮、代码检查、格式化、压缩、转译等，使用AST来处理源代码都是最方便的。又比如`ES5`和`ES6`语法有不少差异，为了向后兼容，在实际应用中需要进行转换，这个场景用AST也是最方便的。AST并不是为了逆向而生，但做逆向学会了AST，在解混淆时会更方便。

原本只打算用AST来去除JS代码的控制流平坦化，但发现只有先熟悉AST的相关操作，才能更好地完成这个目标。索性我把一篇blog拆成一个系列，来讲清楚所有相关知识。相信在看到这个系列以后，大家都会感慨AST真简单！如果和我一样鶸，就把这些代码跑一遍，很快就能学会！

### 技术选型

1. shelljs：在nodejs中执行cmd命令。
2. Babel：解析AST，修改AST并重新生成代码。在 [astexplorer](https://astexplorer.net/) 中还展示了`recast`等包，它们都能做这件事。
3. eslint：检查代码格式是否符合规范，并尝试自动format代码。
4. TypeScript

这里只有`Babel`是必须的，但为了在提升开发效率的同时保证代码的健壮，还是建议把TS、eslint配好。

#### 为什么要用TypeScript

1. Babel的官方文档语焉不详，TypeScript的类型提示结合IDE是更好的文档。
2. 写类型守卫的过程是在倒逼自己去思考各种边界情况，写出更健壮的代码。

### IDEA配置eslint踩坑记录

每次配置eslint，eslint都有新的方式来折磨我，我愿称之为yyds。

#### eslint报错：TypeError: this.options.parse is not a function

IDEA配置的eslint不要大于等于**`8.23.0`**，否则你会遇到这个错误：

```
TypeError: this.options.parse is not a function
```

那么我们的`package.json`得这么写：`"eslint": "8.22.0"`。

#### eslint报cliEngine的错

打开`<IDEA安装目录>\plugins\JavaScriptLanguage\languageService\eslint\bin\eslint-plugin.js`。

```js
// 旧版用
this.cliEngine = require(this.basicPath + "lib/cli-engine");
// 新版用
this.cliEngine = require(this.basicPath + "lib/cli-engine").CLIEngine;
```

当然有兼容的写法：`?.`即可，但es2020很可能不支持，自己polyfill一下就行。

#### IDEA配置自动format

`yarn add`之后，要根据参考链接3来配置：

1. `Languages & Frameworks -> JavaScript -> Code Quality Tools -> ESLint`，勾选Enable，然后填相关的字段。
2. `设置 -> ESLint Settings`，勾选Enable，然后填`Path to eslint bin`，勾选`Auto fix errors`等字段。
3. 打开`设置 -> Keymap`搜索`Fix ESLint Problems`，配置快捷键。

看到`JS / TS`代码标红，并且能按快捷键format代码就成功了。总之能配置的都配置一下，免得它老不生效……

> 后续：呵呵呵这次IDEA叕不能显示TypeScript的eslint错误了，明明啥都装了……幸好还能通过`npm run lint`来format。不得不说**eslint永远得神**……

### 动态指定执行命令（1）用npm scripts+nodejs脚本解决

希望实现：在项目根目录输入命令`npm run cff <fname>`，自动执行`tsc && node src/<fname>.js`。

这方面资料少得可怜，参考链接1已经是能找到的里面最好的了。

根据参考链接1，尝试过在`package.json`里加`fname`属性，然后读取`%npm_package_fname%`，但发现读不到值，因为必须放到`package.json`的`config`属性里；也尝试过在`package.json`的`config`对象里加自定义属性`fname`，这次`%npm_package_fname%`能读到值但无法修改。于是我们只能用最麻烦但最灵活的方案了：

用nodejs写个脚本，然后用npm scripts包装一下。

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

给一个demo（`src/check_pass_demo.ts`）最简单的代码：

```ts
import fs from 'fs';

function getFile (path: string) {
  return fs.readFileSync(path, 'utf-8');
}

const jsCode = getFile('src/inputs/check_pass_demo.js'); // 运行者不是自己，所以要相对于项目根目录
console.log(jsCode.substring(0, 60));
```

运行命令：

```bash
npm run cff check_pass_demo
```

### 动态指定执行命令更好的做法（2）%npm_config_<参数名>%

这种方式更好，甚至支持多个参数。`package.json`的`scripts`添加：

```json
"scripts": {
    "xxx": "node %npm_config_x1%/%npm_config_x2%.js"
}
```

命令：

```bash
npm run xxx --x1=src --x2=hw
```

虽然输出的命令是`node %npm_config_x1%/%npm_config_x2%.js`，但是确实执行的是`node src/hw.js`。值得注意的是，`yarn xxx --x1=src --x2=hw`会报错，暂时**不清楚原因**。

### 动态指定执行命令（3）基于ts-node

基于`ts-node`的好处是：不再需要用`tsc`命令生成多余的js文件。新增命令：

```json
{
  "scripts": {
    "exp": "node --loader ts-node/esm %npm_config_fname%"
  }
}
```

食用方式：`npm run exp --fname=src/switch_cff_demo.ts`。

### TypeScript配置Jest单元测试

首先执行命令：

```bash
yarn add jest ts-jest @types/jest -D
# npx从npm5.2版本开始，就与npm捆绑在一起，所以可以直接用npx命令。如果不行就yarn add global npx
# 创建jest.config.js
npx ts-jest config:init
yarn add babel-jest @babel/core @babel/preset-env @babel/preset-typescript -D
```

`npx`命令生成的`jest.config.js`：

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node'
};
```

接着，根据[官方文档](https://jestjs.io/zh-Hans/docs/getting-started#%E4%BD%BF%E7%94%A8-typescript)（参考链接8），为了让Jest支持TS，必须配置好Babel。新建`babel.config.js`：

```js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }}],
    '@babel/preset-typescript'
  ]
};
```

然后，在package.json文件中添加命令，方便我们执行测试命令：

```json
"scripts": {
    "test": "jest",
    "test:help": "jest --help",
}
```

环境配好了，可以开始写代码了！`test/translate_literal.test.ts`（文件名必须以`.test.ts`结尾，文件所处的位置倒不重要）：

```ts
import { translateLiteral } from '../src/translate_literal';
import * as parser from '@babel/parser';
import generator from '@babel/generator';

test('Unicode Escape Sequence', () => {
  const jsCode = 'const s=\'\x66\x6c\x61\x67\x7b\u522b\u5b66\u4e86\uff0c\u7761\u5927\u89c9\u53bb\uff01\x7d\';';
  const expected = 'const s = \'flag{别学了，睡大觉去！}\';';
  const ast = parser.parse(jsCode);
  translateLiteral(ast);
  const { code: res } = generator(ast);
  expect(res).toBe(expected);
});

// 目前translateLiteral不支持010 = 8的识别
test('Numbers', () => {
  const jsCode = 'const v = 0x31 + 0o10 + 0b100 + 2;';
  const expected = 'const v = 49 + 8 + 4 + 2;';
  const ast = parser.parse(jsCode);
  translateLiteral(ast);
  const { code: res } = generator(ast);
  expect(res).toBe(expected);
});
```

执行单测可以用命令：

```bash
yarn test
```

也可以直接点击代码行号旁边绿色的三角形。

### 参考资料

1. npm package.json scripts 传递参数的解决方案：https://juejin.cn/post/7032919800662016031
2. node执行shell命令：https://www.jianshu.com/p/c0d31513953a
3. IDEA配置eslint：https://blog.csdn.net/weixin_33850015/article/details/91369049
4. 利用AST对抗js混淆(三) 控制流平坦化(Control Flow Flattening)的处理：https://blog.csdn.net/lacoucou/article/details/113665767
5. Babel AST节点介绍：https://www.jianshu.com/p/4f27f4aa576f
6. Babel还原不直观的编码字符串或数值：https://lzc6244.github.io/2021/07/28/Babel%E8%BF%98%E5%8E%9F%E4%B8%8D%E7%9B%B4%E8%A7%82%E7%9A%84%E7%BC%96%E7%A0%81%E5%AD%97%E7%AC%A6%E4%B8%B2%E6%88%96%E6%95%B0%E5%80%BC.html
7. AST在js逆向中switch-case反控制流平坦化：https://blog.csdn.net/Python_DJ/article/details/126882432
8. Jest官方文档：https://jestjs.io/zh-Hans/docs/getting-started#%E4%BD%BF%E7%94%A8-typescript

## 用Babel解析AST处理OB混淆JS代码（二）：一些通用的基本操作

### 引言

在开始用AST来进行JS代码的修改之前，我们先通过一些例子看AST的形态。在 [astexplorer](https://astexplorer.net/) 中选择编译器`@babel/parser`，输入一行代码：`obj['x'](1)`。

```json
ExpressionStatement  {
  type: "ExpressionStatement"
  start: 0
  end: 11
  loc: {start, end, filename, identifierName}
  expression: CallExpression  {
    type: "CallExpression"
    start: 0
    end: 11
    loc: {start, end, filename, identifierName}
    callee: MemberExpression  {
      type: "MemberExpression"
      start: 0
      end: 8
      loc: {start, end, filename, identifierName}
      object: Identifier  = $node {
        type: "Identifier"
        start: 0
        end: 3
        loc: {start, end, filename, identifierName}
        name: "obj"
      }
      computed: true
      property: StringLiteral  {
        type: "StringLiteral"
        start: 4
        end: 7
        loc: {start, end, filename, identifierName}
        extra: {rawValue, raw}
        value: "x"
      }
    }
    arguments:  [
      NumericLiteral  {
        type: "NumericLiteral"
        start: 9
        end: 10
        loc: {start, end, filename, identifierName}
        extra: {rawValue, raw}
        value: 1
      }
    ]
  }
}
```

归纳出一些特征：

1. 因为对象是先取属性，再进行调用，所以AST是`CallExpression`在`MemberExpression`的上面。
2. `obj`变量名对应`Identifier`，常量串对应`StringLiteral`，数字对应`NumericLiteral`。
3. `CallExpression`主要关注`callee`和`arguments`属性，分别表示被调用的函数和参数列表。
4. `MemberExpression`主要关注`object`、`property`和`computed`属性，分别表示对象，属性和是否是计算属性。`Dot Notation`和`Array Notation`的`computed`分别为`false`和`true`。

我们需要不断地看AST，归纳出特征，才能写出正确的代码。更进一步地说，整篇blog的核心其实只有4个字：**特征匹配**。受限于编程能力，我也和大家一样，没有能力提供一个放之四海而皆准的AST脚本。承认这一点之后，我们反而可以放开手脚，为每个使用OB的网站进行代码定制，将更多“业务相关”（即只适用于当前网站）的特征用代码表达出来。

**作者：[hans774882968](https://blog.csdn.net/hans774882968)以及[hans774882968](https://juejin.cn/user/1464964842528888)以及[hans774882968](https://www.52pojie.cn/home.php?mod=space&uid=1906177)**

### 写AST处理代码的套路

接下来看看AST处理代码的骨架：

```ts
import generator from '@babel/generator';
import traverse from '@babel/traverse';
import {
  Node,
  isIdentifier,
  isMemberExpression,
  // ...
} from '@babel/types';

const ast = parser.parse(jsCode);
traverse(ast, {
  // 在递归遍历子树之前，对是Identifier的节点进行修改
  Identifier (path: NodePath<Identifier>) {...}
});
// 省略多个traverse
traverse(ast, {
  // 是某种类型的节点，则调用对应的函数进行修改
  NumericLiteral (path) {...},
  StringLiteral (path) {...}
});
const { code } = generator(ast);
```

`traverse`用dfs遍历AST，并在遍历前后提供钩子给我们，用于修改AST的节点。

我们需要知道关于节点的一些知识。所有的节点都是`Node`，用IEDA点击`Node`查看类型定义：

```ts
export type Node = Accessor | AnyTypeAnnotation | ArgumentPlaceholder | ArrayExpression | ArrayPattern | ArrayTypeAnnotation | ArrowFunctionExpression | AssignmentExpression | AssignmentPattern | AwaitExpression | BigIntLiteral | Binary | BinaryExpression | BindExpression | Block | BlockParent | BlockStatement | BooleanLiteral | BooleanLiteralTypeAnnotation | BooleanTypeAnnotation | BreakStatement | CallExpression | CatchClause | Class | ClassAccessorProperty | ClassBody | ClassDeclaration | ClassExpression | ClassImplements | ClassMethod | ClassPrivateMethod | ClassPrivateProperty | ClassProperty | CompletionStatement | Conditional | ConditionalExpression | ContinueStatement | DebuggerStatement | DecimalLiteral | Declaration | DeclareClass | DeclareExportAllDeclaration | DeclareExportDeclaration | DeclareFunction | DeclareInterface | DeclareModule | DeclareModuleExports | DeclareOpaqueType | DeclareTypeAlias | DeclareVariable | DeclaredPredicate | Decorator | Directive | DirectiveLiteral | DoExpression | DoWhileStatement | EmptyStatement | EmptyTypeAnnotation | EnumBody | EnumBooleanBody | EnumBooleanMember | EnumDeclaration | EnumDefaultedMember | EnumMember | EnumNumberBody | EnumNumberMember | EnumStringBody | EnumStringMember | EnumSymbolBody | ExistsTypeAnnotation | ExportAllDeclaration | ExportDeclaration | ExportDefaultDeclaration | ExportDefaultSpecifier | ExportNamedDeclaration | ExportNamespaceSpecifier | ExportSpecifier | Expression | ExpressionStatement | ExpressionWrapper | File | Flow | FlowBaseAnnotation | FlowDeclaration | FlowPredicate | FlowType | For | ForInStatement | ForOfStatement | ForStatement | ForXStatement | Function | FunctionDeclaration | FunctionExpression | FunctionParent | FunctionTypeAnnotation | FunctionTypeParam | GenericTypeAnnotation | Identifier | IfStatement | Immutable | Import | ImportAttribute | ImportDeclaration | ImportDefaultSpecifier | ImportNamespaceSpecifier | ImportSpecifier | IndexedAccessType | InferredPredicate | InterfaceDeclaration | InterfaceExtends | InterfaceTypeAnnotation | InterpreterDirective | IntersectionTypeAnnotation | JSX | JSXAttribute | JSXClosingElement | JSXClosingFragment | JSXElement | JSXEmptyExpression | JSXExpressionContainer | JSXFragment | JSXIdentifier | JSXMemberExpression | JSXNamespacedName | JSXOpeningElement | JSXOpeningFragment | JSXSpreadAttribute | JSXSpreadChild | JSXText | LVal | LabeledStatement | Literal | LogicalExpression | Loop | MemberExpression | MetaProperty | Method | Miscellaneous | MixedTypeAnnotation | ModuleDeclaration | ModuleExpression | ModuleSpecifier | NewExpression | Noop | NullLiteral | NullLiteralTypeAnnotation | NullableTypeAnnotation | NumberLiteral | NumberLiteralTypeAnnotation | NumberTypeAnnotation | NumericLiteral | ObjectExpression | ObjectMember | ObjectMethod | ObjectPattern | ObjectProperty | ObjectTypeAnnotation | ObjectTypeCallProperty | ObjectTypeIndexer | ObjectTypeInternalSlot | ObjectTypeProperty | ObjectTypeSpreadProperty | OpaqueType | OptionalCallExpression | OptionalIndexedAccessType | OptionalMemberExpression | ParenthesizedExpression | Pattern | PatternLike | PipelineBareFunction | PipelinePrimaryTopicReference | PipelineTopicExpression | Placeholder | Private | PrivateName | Program | Property | Pureish | QualifiedTypeIdentifier | RecordExpression | RegExpLiteral | RegexLiteral | RestElement | RestProperty | ReturnStatement | Scopable | SequenceExpression | SpreadElement | SpreadProperty | Standardized | Statement | StaticBlock | StringLiteral | StringLiteralTypeAnnotation | StringTypeAnnotation | Super | SwitchCase | SwitchStatement | SymbolTypeAnnotation | TSAnyKeyword | TSArrayType | TSAsExpression | TSBaseType | TSBigIntKeyword | TSBooleanKeyword | TSCallSignatureDeclaration | TSConditionalType | TSConstructSignatureDeclaration | TSConstructorType | TSDeclareFunction | TSDeclareMethod | TSEntityName | TSEnumDeclaration | TSEnumMember | TSExportAssignment | TSExpressionWithTypeArguments | TSExternalModuleReference | TSFunctionType | TSImportEqualsDeclaration | TSImportType | TSIndexSignature | TSIndexedAccessType | TSInferType | TSInstantiationExpression | TSInterfaceBody | TSInterfaceDeclaration | TSIntersectionType | TSIntrinsicKeyword | TSLiteralType | TSMappedType | TSMethodSignature | TSModuleBlock | TSModuleDeclaration | TSNamedTupleMember | TSNamespaceExportDeclaration | TSNeverKeyword | TSNonNullExpression | TSNullKeyword | TSNumberKeyword | TSObjectKeyword | TSOptionalType | TSParameterProperty | TSParenthesizedType | TSPropertySignature | TSQualifiedName | TSRestType | TSStringKeyword | TSSymbolKeyword | TSThisType | TSTupleType | TSType | TSTypeAliasDeclaration | TSTypeAnnotation | TSTypeAssertion | TSTypeElement | TSTypeLiteral | TSTypeOperator | TSTypeParameter | TSTypeParameterDeclaration | TSTypeParameterInstantiation | TSTypePredicate | TSTypeQuery | TSTypeReference | TSUndefinedKeyword | TSUnionType | TSUnknownKeyword | TSVoidKeyword | TaggedTemplateExpression | TemplateElement | TemplateLiteral | Terminatorless | ThisExpression | ThisTypeAnnotation | ThrowStatement | TopicReference | TryStatement | TupleExpression | TupleTypeAnnotation | TypeAlias | TypeAnnotation | TypeCastExpression | TypeParameter | TypeParameterDeclaration | TypeParameterInstantiation | TypeScript | TypeofTypeAnnotation | UnaryExpression | UnaryLike | UnionTypeAnnotation | UpdateExpression | UserWhitespacable | V8IntrinsicIdentifier | VariableDeclaration | VariableDeclarator | Variance | VoidTypeAnnotation | While | WhileStatement | WithStatement | YieldExpression;
```

`Node`包含了`MemberExpression`、`Identifier`和`StringLiteral`等。

对于`NodePath`我们暂时不需要知道太多，只需要知道：

1. `path.replaceInline(Nodes extends Node | readonly Node[])`（可以传`Node[]`）、`path.replaceWith(Node)`等方法可以替换当前节点。
2. `path.remove()`可以删除当前节点。
3. `path.node`可以获取`NodePath`对应的节点。

我们写AST处理代码的流程一般是：

1. 通过AST的相关属性来匹配特征，找到要修改的节点所对应的`NodePath`。这部分代码占了绝大部分。这一步需要大量使用”类型守卫“的技巧来保证我们的代码考虑到了各种边界条件。
2. 调用`path.replaceInline`等方法来修改AST。
3. 删除对修改后的AST无用的节点，如未用到的变量和函数声明。

这个工作最困难的地方在于，我们需要不停地观看 [astexplorer](https://astexplorer.net/) 给出的AST，来调整代码。最后再强调一次为什么要用TS：

1. Babel的官方文档语焉不详，TypeScript的类型提示结合IDE是更好的文档。
2. 写类型守卫的过程是在倒逼自己去思考各种边界情况，写出更健壮的代码。

接下来给出几个有通用性的操作的demo，来迅速入门。

### 还原不直观的编码字符串或数值

对于数字，希望把`0x14`等变成10进制；对于常量串，希望把`'\u', '\x'`恢复成可见字符。参考链接6的代码处理得很不错。`src/translate_literal.ts`：

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

我们设计了一个简单的变量重命名方案：先遍历一次AST，收集所有”可以重命名的“变量，再给出新名字（形如`v1, v2, ...`），最后再遍历一次AST进行替换。

- 为了提供最大的灵活性，我们设计了一个`canReplace`函数，让调用者自己决定哪些变量是参与替换的。
- 我们设计了一个`renameMap`，允许调用者给出期望的变量重命名方案，提高可读性。

注意：对于全局变量与局部变量存在同名的情况，这段代码可能是有问题的。希望能基于作用域进行完善。

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

// 调用
renameVars(
  ast,
  (name: string) => name.substring(0, 3) === '_0x',
  {
    enc: 'enc', _0x263396: 'i', _0x13adf6: 'out'
  }
);
```

### Babel MemberExpression Array Notation转Dot Notation

前文提到，`Dot Notation`和`Array Notation`的`computed`分别为`false`和`true`。因此代码会很简单。

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
6. Babel还原不直观的编码字符串或数值：https://lzc6244.github.io/2021/07/28/Babel%E8%BF%98%E5%8E%9F%E4%B8%8D%E7%9B%B4%E8%A7%82%E7%9A%84%E7%BC%96%E7%A0%81%E5%AD%97%E7%AC%A6%E4%B8%B2%E6%88%96%E6%95%B0%E5%80%BC.html
7. AST在js逆向中switch-case反控制流平坦化：https://blog.csdn.net/Python_DJ/article/details/126882432
8. Jest官方文档：https://jestjs.io/zh-Hans/docs/getting-started#%E4%BD%BF%E7%94%A8-typescript

## 用Babel解析AST处理OB混淆JS代码（三）：处理Strings Transformations

### 引言

[这个网站](https://obfuscator.io/)就是[开源项目](https://github.com/javascript-obfuscator/javascript-obfuscator) `javascript-obfuscator`（简称OB）的Web UI。它提供了一个`Strings Transformations`选项用于隐藏常量串。据我所知，还没有给出`Strings Transformations`解决方案的blog，因此可谓全网首创。我们勾选`String Array, String Array Rotate, String Array Shuffle`这3个选项，观察一下生成的代码的特征：

```js
(function(_0x1f23fa, _0x502274) {
	var _0x1841e6 = _0x546b,
		_0x54332a = _0x1f23fa();
	while ([]) {
		try {
			var _0x37b83c = -parseInt(_0x1841e6(0x72)) / 0x1 + parseInt(_0x1841e6(0x73)) / 0x2 * (-parseInt(_0x1841e6(0x7c)) / 0x3) + parseInt(_0x1841e6(0x88)) / 0x4 * (parseInt(_0x1841e6(0x89)) / 0x5) + -parseInt(_0x1841e6(0x71)) / 0x6 + parseInt(_0x1841e6(0x6c)) / 0x7 * (-parseInt(_0x1841e6(0x85)) / 0x8) + -parseInt(_0x1841e6(0x82)) / 0x9 + -parseInt(_0x1841e6(0x7e)) / 0xa * (-parseInt(_0x1841e6(0x78)) / 0xb);
			if (_0x37b83c === _0x502274) break;
			else _0x54332a['push'](_0x54332a['shift']());
		} catch (_0x258ebb) {
			_0x54332a['push'](_0x54332a['shift']());
		}
	}
}(_0x3ddf, 0x20d95));

function _0x546b(_0x280dd3, _0x383a2d) {
	var _0x3ddf54 = _0x3ddf();
	return _0x546b = function(_0x546b3f, _0x142ae2) {
		_0x546b3f = _0x546b3f - 0x6c;
		var _0x233a8a = _0x3ddf54[_0x546b3f];
		return _0x233a8a;
	}, _0x546b(_0x280dd3, _0x383a2d);
}

function _0x3ddf() {
	var _0x45c37a = ['30037Sxrenc', 'error!', 'len\x20error', 'XmvLm', 'Orz..', '1159374JpqDju', '267734qPEpMO', '364750QkecUn', 'shrai', 'length', 'KUTlo', 'Vwtjq', '99juDGtv', 'FhQZn', 'charCodeAt', 'FdUfK', '3tSVDal', 'Ajnur', '874980MJshmD', 'KclRu', 'Fhqhk', 'charAt', '187074oiwMPp', 'PjAeQ', 'ewhZd', '328PNtXbI', 'congratulation!', 'DpUmp', '57576xxZPaZ', '65fmhmYN', 'ualDk', 'RHSOY', 'log'];
	_0x3ddf = function() {
		return _0x45c37a;
	};
	return _0x3ddf();
}
```

**作者：[hans774882968](https://blog.csdn.net/hans774882968)以及[hans774882968](https://juejin.cn/user/1464964842528888)以及[hans774882968](https://www.52pojie.cn/home.php?mod=space&uid=1906177)**

可知：

- 有一个自执行函数和两个函数。这3个函数会随机换位置，干扰你的分析。之所以可以换位置，是因为JS有函数提升机制。
- 有常量串数组的函数`_0x3ddf`，利用**闭包**来给出常量串数组，记为`sl`。
- `_0x546b`函数仅仅相当于`(idx) => sl[idx - 0x6c]`。
- 自执行函数可以进行常量串数组的`shuffle`和`rotate`。在这个例子中只进行了`rotate`。这里用到了`parseInt`的一个性质：字符串以数字为前缀时，只会解析到前面的数字。因此可以肯定OB生成的这些数字所对应的表达式的值要么等于入参`0x20d95`，要么得到`NaN`。这个套路主要是导致`rotate`操作次数不确定了，如果我们希望写出自动化的脚本，就不得不提取这个表达式的所有函数参数，再模拟自执行函数的执行过程。提取函数参数的思路是有的：特征匹配+自行实现一段dfs，不过实现起来就比较麻烦了，放到以后的TODO里吧~

再看常量串的获取方式：`_0x583af1(0x74)`。因此我们的目标就是把这种函数调用恢复为常量串。开工！

首先，每个函数开头都有`var _0x583af1 = _0x546b`这样的定义，因此我们需要识别实际上等于`_0x546b`的变量。相关代码：

```ts
  // 如果常量表不止1处，则此代码不正确  
  const stringLiteralFuncs = ['_0x546b'];
  // 收集与常量串隐藏有关的变量
  traverse(ast, {
    VariableDeclarator (path) {
      const vaNode = path.node;
      if (!isIdentifier(vaNode.init) || !isIdentifier(vaNode.id)) return;
      if (stringLiteralFuncs.includes(vaNode.init.name)) {
        stringLiteralFuncs.push(vaNode.id.name);
      }
    }
  });
```

接下来需要拿到最终的常量串数组。暂时没找到优雅的方式，只能先用一个妥协方案：

1. 因为常量串数组的最终形态是固定的，所以我们首先直接在浏览器控制台运行一下上面那段代码，再输入`_0x3ddf()`拿到常量串数组的最终形态，然后把它硬编码进代码里。
2. 获取常量串的函数，我们设计为自行实现，即**硬编码**进代码里。

获取常量串的相关代码（直接展示了函数`restoreStringLiteral`如何调用）：

```ts
restoreStringLiteral(ast, (idx: number) => {
  return ['30037Sxrenc', 'error!', 'len\x20error', 'XmvLm', 'Orz..', '1159374JpqDju', '267734qPEpMO', '364750QkecUn', 'shrai', 'length', 'KUTlo', 'Vwtjq', '99juDGtv', 'FhQZn', 'charCodeAt', 'FdUfK', '3tSVDal', 'Ajnur', '874980MJshmD', 'KclRu', 'Fhqhk', 'charAt', '187074oiwMPp', 'PjAeQ', 'ewhZd', '328PNtXbI', 'congratulation!', 'DpUmp', '57576xxZPaZ', '65fmhmYN', 'ualDk', 'RHSOY', 'log'][idx - 108];
});
// 调用：getStringArr(idx)
```

最后，只需要`path.replaceWith(stringLiteral(getStringArr(idx)))`完成节点的替换。

完整的相关代码：

```ts
function restoreStringLiteral (ast: Node, getStringArr: (idx: number) => string) {
  // 如果常量表不止1处，则此代码不正确
  const stringLiteralFuncs = ['_0x546b'];
  // 收集与常量串隐藏有关的变量
  traverse(ast, {
    VariableDeclarator (path) {
      const vaNode = path.node;
      if (!isIdentifier(vaNode.init) || !isIdentifier(vaNode.id)) return;
      if (stringLiteralFuncs.includes(vaNode.init.name)) {
        stringLiteralFuncs.push(vaNode.id.name);
      }
    }
  });
  traverse(ast, {
    CallExpression (path) {
      const cNode = path.node;
      if (!isIdentifier(cNode.callee)) return;
      const varName = cNode.callee.name;
      if (!stringLiteralFuncs.includes(varName)) return;
      if (cNode.arguments.length !== 1 || !isNumericLiteral(cNode.arguments[0])) return;
      const idx = cNode.arguments[0].value;
      path.replaceWith(stringLiteral(getStringArr(idx)));
    }
  });
}
restoreStringLiteral(ast, (idx: number) => {
  return ['30037Sxrenc', 'error!', 'len\x20error', 'XmvLm', 'Orz..', '1159374JpqDju', '267734qPEpMO', '364750QkecUn', 'shrai', 'length', 'KUTlo', 'Vwtjq', '99juDGtv', 'FhQZn', 'charCodeAt', 'FdUfK', '3tSVDal', 'Ajnur', '874980MJshmD', 'KclRu', 'Fhqhk', 'charAt', '187074oiwMPp', 'PjAeQ', 'ewhZd', '328PNtXbI', 'congratulation!', 'DpUmp', '57576xxZPaZ', '65fmhmYN', 'ualDk', 'RHSOY', 'log'][idx - 108];
});
```

为了配合后文《避免硬编码》的实现，我还是将`restoreStringLiteral`的参数改为3个了：`ast, stringLiteralFuncs, getStringArr`，于是这段逻辑就完全依赖于“只有1处常量表”的假设了。

TODO：找到一种避免硬编码的方式！

### 避免硬编码：最简单的情况

样例：

```js
var _0xa9e0 = ['JxsFw', 'iksgN', 'qDbwG', 'prototype', 'spzgJ', 'test', 'lo1c0tQyRk7E/Lr2p3puiAKrzgb8Absq4EWawXjoVfP230ItoMvvmsg3H8ccHG1u1qA+T/T4f3Rwi5j40osnuhQGtUj0w5rjN5FglNam4JRHNS126MHWX6+Zk/Aez8M7WttDCxtn6N6/pwWRtVat6vPkvmw9ETifmJ5C94R9hoGnDvNjntiKW6m5HPr+b/j0IvHCUJz8pX4ofi12NyD5aA==', 'enc', 'Latin1', 'parse', 'B79CD410AF398F7A', 'window', 'location', 'href', '146385F634C9CB00', 'ZeroPadding', 'toString', 'Utf8', 'split', 'length', 'createElement', 'style', 'type', 'text/css', 'setAttribute', 'link', 'getElementsByTagName', 'gHLRp', 'CbiRt', 'oKMpY', 'parentNode', 'head', 'appendChild', '4|1|2|5|3|0', 'fromCharCode', 'NQvuJ', 'TYKEL', 'undefined', 'tfwZU', 'ffVsL', 'styleSheets', 'addRule', '.context_kw', '::before', 'content:\x20\x22', 'insertRule', '::before{content:\x20\x22', 'pad', 'clamp', 'sigBytes', 'words', 'BXNBf', 'OMxlD', 'GhFlG'];
(function (_0x149720, _0x36191f) {
  var _0x19a768 = function (_0x5065e2) {
    while (--_0x5065e2) {
      _0x149720['push'](_0x149720['shift']());
    }
  };
  _0x19a768(++_0x36191f);
}(_0xa9e0, 0x1a9));
var _0x0a9e = function (_0x2b4d76, _0x47bf96) {
  _0x2b4d76 = _0x2b4d76 - 0x0;
  var _0x4230d8 = _0xa9e0[_0x2b4d76];
  return _0x4230d8;
};
```

我们需要做的事情主要有：

1. 获取偏移量，即上述例子中的`0x0`。
2. 获取`rotate`次数，即上述例子中的`0x1a9`。这是为了获取大数组最终的值。
3. 获取大数组。
4. 调用上面已经实现的`restoreStringLiteral`函数。

这个样例是旧版OB生成的，情况比较简单。与上述样例使用`parseInt`隐藏真实`rotate`次数相比，这里只需要匹配这个自执行函数即可拿到`rotate`次数。难点在于“大数组”的匹配——固然可以认为数组长度最大的就是“大数组”，但这不总是可靠。但考虑到，面对一个使用OB的新网站时，受限于编程能力，我们几乎无法直接复用AST脚本，都需要对网站进行定制，上述简单策略其实完全可用（TODO：补充将最大长度的数组视为“大数组”的实现）。我这次实现选择的策略如下：

1. 获取偏移量的函数体仅处理具有上述3条语句的结构，然后从第1条语句中取出偏移量的值。
2. 通过匹配具有2个参数，且第二个参数是`NumericLiteral`的自执行函数来获取`rotate`次数。
3. 复用上一点的逻辑，我们认为自执行函数的第一个参数就是大数组的名称，并通过这个字符串来匹配相应的声明语句。可惜一旦进行wrap，我这个策略就失效了。

函数名为`autoRestoreStringLiteralViaIIFE`，顾名思义，这里我选择的切入点就是自执行函数。

完整代码（[传送门](https://github.com/Hans774882968/control-flow-flattening-remove-public/blob/main/src/restoreStringLiteral.ts)）：

```ts
import {
  isArrayExpression,
  isBlockStatement,
  isCallExpression,
  isExpressionStatement,
  isFunctionExpression,
  isIdentifier,
  isNumericLiteral,
  isReturnStatement,
  isStringLiteral,
  isVariableDeclaration,
  Node,
  stringLiteral,
  File
} from '@babel/types';
import traverse from '@babel/traverse';
import { strict as assert } from 'assert';
import generator from '@babel/generator';

// 如果常量表不止1处，则此代码不正确
export function restoreStringLiteral (ast: Node, stringLiteralFuncs: string[], getStringArr: (idx: number) => string) {
  // 收集与常量串隐藏有关的变量
  traverse(ast, {
    VariableDeclarator (path) {
      const vaNode = path.node;
      if (!isIdentifier(vaNode.init) || !isIdentifier(vaNode.id)) return;
      if (stringLiteralFuncs.includes(vaNode.init.name)) {
        stringLiteralFuncs.push(vaNode.id.name);
      }
    }
  });
  traverse(ast, {
    CallExpression (path) {
      const cNode = path.node;
      if (!isIdentifier(cNode.callee)) return;
      const varName = cNode.callee.name;
      if (!stringLiteralFuncs.includes(varName)) return;
      const literalNode = cNode.arguments[0];
      if (cNode.arguments.length !== 1 || (!isNumericLiteral(literalNode) && !isStringLiteral(literalNode))) return;
      const idx = Number(literalNode.value);
      path.replaceWith(stringLiteral(getStringArr(idx)));
    }
  });
}

export function rotateArray<T> (a: T[], count: number) {
  count %= a.length;
  return [...a.slice(count), ...a.slice(0, count)];
}

export function autoRestoreStringLiteralViaIIFE (ast: File) {
  let constArrName = '';
  const INITIAL_SHIFT_NUM = -1234567;
  let shiftNum = INITIAL_SHIFT_NUM;
  ast.program.body.findIndex((bodyItem) => {
    if (!isExpressionStatement(bodyItem) ||
        !isCallExpression(bodyItem.expression) ||
        !isFunctionExpression(bodyItem.expression.callee) ||
        bodyItem.expression.arguments.length !== 2) return false;
    const [arg0, arg1] = bodyItem.expression.arguments;
    if (!isIdentifier(arg0) || !isNumericLiteral(arg1)) return false;
    constArrName = arg0.name;
    shiftNum = arg1.value;
    return true;
  });
  assert.ok(constArrName);
  assert.notEqual(shiftNum, INITIAL_SHIFT_NUM);

  let constArrContent: string[] = [];
  let stringHideVarName = '';
  let globalOffset = 0;
  traverse(ast, {
    VariableDeclaration (path) {
      const decl = path.node.declarations[0];
      if (!isIdentifier(decl.id)) return;
      if (decl.id.name === constArrName && isArrayExpression(decl.init)) {
        constArrContent = decl.init.elements.map((item) => {
          assert.ok(isStringLiteral(item));
          return item.value;
        });
      }
      if (isFunctionExpression(decl.init)) {
        if (decl.init.params.length !== 2 ||
            !isBlockStatement(decl.init.body) ||
            decl.init.body.body.length !== 3) return;
        const [s1, s2, s3] = decl.init.body.body;
        if (!isExpressionStatement(s1) ||
            !isVariableDeclaration(s2) ||
            !isReturnStatement(s3)) return;

        path.traverse({
          BinaryExpression (path) {
            assert.ok(isNumericLiteral(path.node.right));
            globalOffset = path.node.right.value;
          }
        });

        const { code } = generator(s2);
        if (!code.includes(constArrName)) return;
        stringHideVarName = decl.id.name;
      }
    }
  });
  constArrContent = rotateArray(constArrContent, shiftNum);

  restoreStringLiteral(ast, [stringHideVarName], (idx: number) => {
    return constArrContent[idx - globalOffset];
  });
}
```

### 参考资料

1. npm package.json scripts 传递参数的解决方案：https://juejin.cn/post/7032919800662016031
2. node执行shell命令：https://www.jianshu.com/p/c0d31513953a
3. IDEA配置eslint：https://blog.csdn.net/weixin_33850015/article/details/91369049
4. 利用AST对抗js混淆(三) 控制流平坦化(Control Flow Flattening)的处理：https://blog.csdn.net/lacoucou/article/details/113665767
5. Babel AST节点介绍：https://www.jianshu.com/p/4f27f4aa576f
6. Babel还原不直观的编码字符串或数值：https://lzc6244.github.io/2021/07/28/Babel%E8%BF%98%E5%8E%9F%E4%B8%8D%E7%9B%B4%E8%A7%82%E7%9A%84%E7%BC%96%E7%A0%81%E5%AD%97%E7%AC%A6%E4%B8%B2%E6%88%96%E6%95%B0%E5%80%BC.html
7. AST在js逆向中switch-case反控制流平坦化：https://blog.csdn.net/Python_DJ/article/details/126882432
8. Jest官方文档：https://jestjs.io/zh-Hans/docs/getting-started#%E4%BD%BF%E7%94%A8-typescript

## 用Babel解析AST处理OB混淆JS代码（四）：处理控制流平坦化

### 引言

控制流平坦化通过引入状态机与循环，破坏代码上下文之间的阅读连续性和代码块之间的关联性，将若干个分散的小整体整合成一个巨大的循环体。实现方式是将代码块之间的原有顺序关系打断，改为由一个分发器来控制代码块的跳转。特点：

- 无法还原成原来具体的函数。
- 无法使用以函数为单位的调试方法，大幅度增加调试难度。
- 降低代码运行效率，提高爬虫运行时执行JS的资源成本。
- 可根据JS运行时检测到的某些因素自由跳转到蜜罐或跳出代码执行。

所有教程都没有提及的是：控制流平坦化实际上至少有两种。第一种是语句级别的，用于打乱语序。第二种是表达式级别的，用于替换双目运算符、逻辑运算符和常量等。我们将尽力为 [OB网站](https://obfuscator.io/) 提供的两种控制流平坦化提供解决方案。

**作者：[hans774882968](https://blog.csdn.net/hans774882968)以及[hans774882968](https://juejin.cn/user/1464964842528888)以及[hans774882968](https://www.52pojie.cn/home.php?mod=space&uid=1906177)**

### 去除基于switch语句的控制流平坦化：先来解析一个简单的demo

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
3. 把上面的所有body拼接起来，得所求，类型仍为`Statement[]`。调用`path.replaceInline(Statement[])`来获取去除了控制流平坦化的代码。

`src/hw.ts`的大多数代码都只是做第一步，因为考虑到源代码可能会变，希望有一定通用性。为了方便，也可以选择直接硬编码第一步的结果。因此代码的骨架如下：

```ts
const jsCode = getFile('src/inputs/hw.js');
const ast = parser.parse(jsCode);
const decodeWhileOpts = {
  WhileStatement (path: NodePath<WhileStatement>) {
    const { body } = path.node;
    const switchNode = (body as BlockStatement).body[0];
    if (!isSwitchStatement(switchNode)) return;
    const { discriminant, cases } = switchNode;
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

这里偷懒了一下，直接用`cases[+index]`来取具体的`case`了，实际情况很可能要写额外的代码获取`cases[index].test.value`。

完整代码看`src/hw.ts`。注意：

1. 我们在项目根目录用`npm run cff hw`来运行`src/hw.ts`，所以读写文件要相对于项目根目录。

### 去除基于switch语句的控制流平坦化：更综合的demo

这个demo和上一个demo难度一样，但结合了常量串隐藏。准备以下程序：

```js
function enc (inp) {
  var i = 0;
  i += -1;
  var out = '';
  i += 1;
  for (;i < inp.length;++i) {
    var v = 0;
    if (i & 1) v = 0x33;
    else v = 0x31;
    out += String.fromCharCode(inp[i].charCodeAt() ^ v);
  }
  return out;
}
if (enc('flag{hans}') === 'W_PTJ[P]BN') console.log('pass');
else console.log('try again');
```

在[OB网站](https://obfuscator.io/)勾选`Control Flow Flattening`，`Control Flow Flattening Threshold`选择1，`String Transformations`勾选`String Array, String Array Rotate, String Array Shuffle`，`String Array Threshold`选择1。得以下代码：

```js
var _0x47f9f1 = _0x27c4;
(function (_0x47124a, _0x19f73e) {
  var _0x3b6574 = _0x27c4,
    _0x2c307d = _0x47124a();
  while ([]) {
    try {
      var _0x585cd6 = parseInt(_0x3b6574(0x95)) / 0x1 * (parseInt(_0x3b6574(0x8f)) / 0x2) + -parseInt(_0x3b6574(0x97)) / 0x3 * (parseInt(_0x3b6574(0x9d)) / 0x4) + -parseInt(_0x3b6574(0x89)) / 0x5 + -parseInt(_0x3b6574(0x98)) / 0x6 + -parseInt(_0x3b6574(0x8d)) / 0x7 * (-parseInt(_0x3b6574(0x94)) / 0x8) + parseInt(_0x3b6574(0x96)) / 0x9 * (parseInt(_0x3b6574(0xa1)) / 0xa) + parseInt(_0x3b6574(0x92)) / 0xb;
      if (_0x585cd6 === _0x19f73e) break;
      else _0x2c307d['push'](_0x2c307d['shift']());
    } catch (_0x28b17f) {
      _0x2c307d['push'](_0x2c307d['shift']());
    }
  }
}(_0x379e, 0xdbab3));

function _0x27c4 (_0x122105, _0x24f040) {
  var _0x379e52 = _0x379e();
  return _0x27c4 = function (_0x27c4d4, _0x569919) {
    _0x27c4d4 = _0x27c4d4 - 0x89;
    var _0x5dfb85 = _0x379e52[_0x27c4d4];
    return _0x5dfb85;
  }, _0x27c4(_0x122105, _0x24f040);
}

function _0x379e () {
  var _0x3ed6e2 = ['1914456NQDFwp', '1xRwaZJ', '36ZbcbZP', '3gJgrjU', '8162226GwaJpl', '3|4|2|0|5|1', 'split', 'charCodeAt', 'pass', '6278120IHpVNF', 'W_PTJ[P]BN', 'length', 'fromCharCode', '939280gOLaZV', '661835nuUXrL', 'dKifE', 'try\x20again', 'log', '7aEbwep', 'awvtQ', '2804302XtaWgC', 'rmnID', 'flag{hans}', '21393471OyFTzd', 'lXUhG'];
  _0x379e = function () {
    return _0x3ed6e2;
  };
  return _0x379e();
}

function enc (_0x3bf54e) {
  var _0x55bea2 = _0x27c4,
    _0x550d17 = {
      'dKifE': _0x55bea2(0x99),
      'lXUhG': function (_0x7a78d6, _0x13ee42) {
        return _0x7a78d6 < _0x13ee42;
      },
      'rmnID': function (_0x28f0fb, _0x77896d) {
        return _0x28f0fb & _0x77896d;
      },
      'awvtQ': function (_0x26b565, _0x3ffc0b) {
        return _0x26b565 ^ _0x3ffc0b;
      }
    },
    _0x31ce85 = _0x550d17[_0x55bea2(0x8a)][_0x55bea2(0x9a)]('|'),
    _0x1ffdde = 0x0;
  while ([]) {
    switch (_0x31ce85[_0x1ffdde++]) {
      case '0':
        _0x263396 += 0x1;
        continue;
      case '1':
        return _0x13adf6;
      case '2':
        var _0x13adf6 = '';
        continue;
      case '3':
        var _0x263396 = 0x0;
        continue;
      case '4':
        _0x263396 += -0x1;
        continue;
      case '5':
        for (; _0x550d17[_0x55bea2(0x93)](_0x263396, _0x3bf54e[_0x55bea2(0x9f)]); ++_0x263396) {
          var _0x494484 = 0x0;
          if (_0x550d17[_0x55bea2(0x90)](_0x263396, 0x1)) _0x494484 = 0x33;
          else _0x494484 = 0x31;
          _0x13adf6 += String[_0x55bea2(0xa0)](_0x550d17[_0x55bea2(0x8e)](_0x3bf54e[_0x263396][_0x55bea2(0x9b)](), _0x494484));
        }
        continue;
    }
    break;
  }
}
if (enc(_0x47f9f1(0x91)) === _0x47f9f1(0x9e)) console[_0x47f9f1(0x8c)](_0x47f9f1(0x9c));
else console[_0x47f9f1(0x8c)](_0x47f9f1(0x8b));
```

#### 产生基于switch语句的控制流平坦化的条件

网上众多blog都没提到的：基于switch语句的控制流平坦化不总是能产生，需要一定条件。

1. 所有相关变量必须是`var`声明，否则不能产生。
2. 语句要足够多。

#### 思路

我们可以看到这里产生了一个基于switch语句的控制流平坦化。`_0x31ce85`变量就是字符串`'3|4|2|0|5|1'`，`_0x1ffdde`是单纯的自增变量。为了方便地在代码中拿到`_0x31ce85`的值，我们需要**先去除`Strings Transformations`**（常量串隐藏，可参考本系列的上一篇《[用Babel解析AST处理OB混淆JS代码（三）》](https://www.52pojie.cn/thread-1700050-1-1.html)）。

虽然难度一样，但是这一节我们提供更加完善的代码（~~其实是懒得整理了qwq~~）。我们上一节没有删除控制流平坦化的相关变量，因为比较麻烦。参考链接7提供了一种不错的写法，能够在不硬编码的前提下方便地删除控制流平坦化的相关变量。它先使用`path.scope.getBinding(varName: string)`来获取当前作用域的变量名的`Binding`，然后调用`Binding.path.remove()`删除变量声明。`Binding`更具体的用法可参考：https://juejin.cn/post/7113800415057018894。

删除控制流平坦化相关变量绑定的节点的相关代码：

```ts
const arrayName = discriminant.object.name;
const bindingArray = path.scope.getBinding(arrayName);
if (!bindingArray) return;
const autoIncrementName = discriminant.property.argument.name;
const bindingAutoIncrement = path.scope.getBinding(autoIncrementName);
if (!bindingAutoIncrement) return;
bindingArray.path.remove();
bindingAutoIncrement.path.remove();
```

去除基于switch语句的控制流平坦化部分的代码如下，完整代码见`src/switch_cff_demo.ts`。相比于上一节的代码，换了一种方式获取控制流平坦化的数组的值：

```ts
function switchCFF (ast: Node) {
  traverse(ast, {
    WhileStatement (path) {
      const wNode = path.node;
      if (!isBlockStatement(wNode.body) || !wNode.body.body.length) return;
      const switchNode = wNode.body.body[0];
      if (!isSwitchStatement(switchNode)) return;
      const { discriminant, cases } = switchNode;
      if (!isMemberExpression(discriminant) ||
          !isIdentifier(discriminant.object)) return;
      // switch语句内的控制流平坦化数组名，本例中是 _0x31ce85
      const arrayName = discriminant.object.name;
      // 获取控制流数组绑定的节点
      const bindingArray = path.scope.getBinding(arrayName);
      if (!bindingArray) return;
      // 经过restoreStringLiteral，我们认为它已经恢复为'v1|v2...'['split']('|')
      if (!isVariableDeclarator(bindingArray.path.node) ||
          !isCallExpression(bindingArray.path.node.init)) return;
      const varInit = bindingArray.path.node.init;
      if (!isMemberExpression(varInit.callee) ||
          !isStringLiteral(varInit.callee.object) ||
          varInit.arguments.length !== 1 ||
          !isStringLiteral(varInit.arguments[0])) return;
      const object = varInit.callee.object.value;
      const propty = varInit.callee.property;
      if (!isStringLiteral(propty) && !isIdentifier(propty)) return;
      const propertyName = isStringLiteral(propty) ? propty.value : propty.name;
      const splitArg = varInit.arguments[0].value;
      // 目前只支持'v1|v2...'.split('|')的解析
      if (propertyName !== 'split') {
        console.warn('switchCFF(ast)：目前只支持\'v1|v2...\'.split(\'|\')的解析');
        return;
      }
      const indexArr = object[propertyName](splitArg);

      const replaceBody = indexArr.reduce((replaceBody, index) => {
        const caseBody = cases[+index].consequent;
        if (isContinueStatement(caseBody[caseBody.length - 1])) {
          caseBody.pop();
        }
        return replaceBody.concat(caseBody);
      }, [] as Statement[]);
      path.replaceInline(replaceBody);

      // 可选择的操作：删除控制流平坦化数组绑定的节点、自增变量名绑定的节点
      if (!isUpdateExpression(discriminant.property) ||
          !isIdentifier(discriminant.property.argument)) return;
      const autoIncrementName = discriminant.property.argument.name;
      const bindingAutoIncrement = path.scope.getBinding(autoIncrementName);
      if (!bindingAutoIncrement) return;
      bindingArray.path.remove();
      bindingAutoIncrement.path.remove();
    }
  });
}
switchCFF(ast);
```

### 表达式级别的控制流平坦化

OB提供的控制流平坦化至少有两种。第一种是语句级别的，基于switch语句，用于打乱语序。第二种是表达式级别的，用于替换双目运算符、逻辑运算符和常量等。

准备一段代码（来自参考链接4）：

```js
function check_pass(passwd) {
    var i=0;
    var sum=0;
    for(i=0;;i++)
    {
        if(i==passwd.length)
        {
            break;
        }
        sum=sum+passwd.charCodeAt(i);
    }
    if(i==4)
    {
        if(sum==0x1a1 && passwd.charAt(3) > 'c' && passwd.charAt(3) < 'e' && passwd.charAt(0)=='b')
        {
            if((passwd.charCodeAt(3)^0xd)==passwd.charCodeAt(1))
            {
                return 1;
            }
            console.log("Orz..");
        }
    }
    else
    {
        console.log("len error")
    }
 
    return 0;
}
 
function test()
{
    if(check_pass("bird"))
    {
        alert( "congratulation!");
    }
    else
    {
        alert( "error!");
    }
}
test();
```

在 [OB网站](https://obfuscator.io/) 中使用如下选项加密：`Control Flow Flattening`，`Control Flow Flattening Threshold`选择1，注意不要让网站隐藏常量串，因为我们这个版本的脚本还不支持。得到的代码如`src/inputs/check_pass_demo_easy.js`所示：

```js
function check_pass (_0x57a7be) {
  var _0x252e28 = {
    'tPlEX': function (_0x52a315, _0x59fdfd) {
      return _0x52a315 == _0x59fdfd;
    },
    'TcjYB': function (_0x300e56, _0x2fe857) {
      return _0x300e56 + _0x2fe857;
    },
    'ZtFYf': function (_0x53b823, _0x136f17) {
      return _0x53b823 == _0x136f17;
    },
    'tPstu': function (_0x1607f2, _0x4a18be) {
      return _0x1607f2 > _0x4a18be;
    },
    'Vhxzy': function (_0x248a47, _0x5a2ca2) {
      return _0x248a47 < _0x5a2ca2;
    },
    'uuFIS': function (_0x3718bc, _0x3081f9) {
      return _0x3718bc == _0x3081f9;
    },
    'cRvgS': function (_0x56fd75, _0x1d2164) {
      return _0x56fd75 ^ _0x1d2164;
    },
    'GsTse': 'Orz..',
    'ykyBq': 'len\x20error'
  };
  var _0x537fc8 = 0x0;
  var _0x3df4b0 = 0x0;
  for (_0x537fc8 = 0x0;; _0x537fc8++) {
    if (_0x252e28['tPlEX'](_0x537fc8, _0x57a7be['length'])) {
      break;
    }
    _0x3df4b0 = _0x252e28['TcjYB'](_0x3df4b0, _0x57a7be['charCodeAt'](_0x537fc8));
  }
  if (_0x252e28['ZtFYf'](_0x537fc8, 0x4)) {
    if (_0x252e28['ZtFYf'](_0x3df4b0, 0x1a1) && _0x252e28['tPstu'](_0x57a7be['charAt'](0x3), 'c') && _0x252e28['Vhxzy'](_0x57a7be['charAt'](0x3), 'e') && _0x252e28['uuFIS'](_0x57a7be['charAt'](0x0), 'b')) {
      if (_0x252e28['uuFIS'](_0x252e28['cRvgS'](_0x57a7be['charCodeAt'](0x3), 0xd), _0x57a7be['charCodeAt'](0x1))) {
        return 0x1;
      }
      console['log'](_0x252e28['GsTse']);
    }
  } else {
    console['log'](_0x252e28['ykyBq']);
  }
  return 0x0;
}
function test () {
  var _0x288152 = {
    'eOZRR': function (_0x3f5c8e, _0x24ced8) {
      return _0x3f5c8e(_0x24ced8);
    },
    'alzHn': 'bird',
    'GyIol': function (_0x5ddbd5, _0x5cc507) {
      return _0x5ddbd5(_0x5cc507);
    },
    'FWSbx': 'congratulation!',
    'tYizA': 'error!'
  };
  if (_0x288152['eOZRR'](check_pass, _0x288152['alzHn'])) {
    _0x288152['GyIol'](alert, _0x288152['FWSbx']);
  } else {
    _0x288152['GyIol'](alert, _0x288152['tYizA']);
  }
}
test();
```

`_0x288152`和`_0x252e28`就是控制流平坦化的哈希表，我们看哈希表的值的几种形式：

- `function(x, y){return x + y}`，对应`BinaryExpression`
- `function(x, y){return x > y}`，对应`LogicalExpression`
- `function(f, ...args){return f(...args)}`
- `function(x){return x}`（在此没出现）
- 非函数（这个例子中，只有`StringLiteral`）

对于函数的情况，调用必定形如`tbl['xxx'](...args)`。对于非函数的情况，调用则形如`tbl['xxx']`。

我们依旧需要不断地观看 https://astexplorer.net/ 给出的AST，做到：

- 哈希表的值是函数的情况，把函数体的`ReturnStatement`抠出来，再拿到函数体的参数，最后才进行替换。
- 哈希表的值不是函数的情况，进行一般意义的替换（参考链接4是直接替换为`StringLiteral`了，我们用TS写，可以有更具一般性的写法：`path.replaceWith<Node>(cffTableValue)`）。

#### 算法时间复杂度优化

参考链接4先遍历了控制流平坦化的哈希表的每一个键值对，然后对每个键值对都完整遍历一遍树。这个时间复杂度不太好。我们可以进行预处理（相关的数据结构`cffTables`，类型为`{[key: string]: {[key: string]: Node}}`），然后通过`cffTables[tableName][keyName]`来访问所需的`Node`。具体见`src/check_pass_demo_easy.ts`。这样我们就只需要遍历树两次了。

#### 代码

由于水平有限（鶸），这段代码：

- 不能识别作用域。如果存在多个层的作用域的变量同名，则无法正确去掉控制流平坦化。
- 控制流平坦化的哈希表的方括号只能识别常量串。需要**先去除常量串隐藏**，再调用该函数。

完整代码见`src/check_pass_demo_easy.ts`：

```ts
function cff (ast: Node) {
  type ASTNodeMap = {[key: string]: Node}
  const cffTables: {[key: string]: ASTNodeMap} = {};
  traverse(ast, {
    VariableDeclarator (path) {
      const node = path.node;
      if (!node.id || !isIdentifier(node.id)) return;
      const tableName = node.id.name;
      if (!isObjectExpression(node.init)) return;
      const tableProperties = node.init.properties;
      cffTables[tableName] = tableProperties.reduce((cffTable, tableProperty) => {
        if (!isObjectProperty(tableProperty) ||
           !isStringLiteral(tableProperty.key)) return cffTable;
        cffTable[tableProperty.key.value] = tableProperty.value;
        return cffTable;
      }, {} as ASTNodeMap);
    }
  });

  traverse(ast, {
    CallExpression (path) {
      const cNode = path.node;
      if (isMemberExpression(cNode.callee)) {
        if (!isIdentifier(cNode.callee.object)) return;
        const callParams = cNode.arguments;
        const tableName = cNode.callee.object.name;
        if (!isStringLiteral(cNode.callee.property)) return;
        const keyName = cNode.callee.property.value;
        if (!(tableName in cffTables) ||
            !(keyName in cffTables[tableName])) return;
        const shouldBeFuncValue = cffTables[tableName][keyName];
        if (!isFunctionExpression(shouldBeFuncValue) ||
            !shouldBeFuncValue.body.body.length ||
            !isReturnStatement(shouldBeFuncValue.body.body[0])) return;
        // 拿到返回值
        const callArgument = shouldBeFuncValue.body.body[0].argument;
        if (isBinaryExpression(callArgument) && callParams.length === 2) {
          if (!isExpression(callParams[0]) || !isExpression(callParams[1])) {
            throw '二元运算符中，两个参数都应为表达式';
          }
          // 处理function(x, y){return x + y}这种形式
          path.replaceWith(binaryExpression(callArgument.operator, callParams[0], callParams[1]));
        } else if (isLogicalExpression(callArgument) && callParams.length === 2) {
          if (!isExpression(callParams[0]) || !isExpression(callParams[1])) {
            throw '逻辑运算符中，两个参数都应为表达式';
          }
          // 处理function(x, y){return x > y}这种形式
          path.replaceWith(logicalExpression(callArgument.operator, callParams[0], callParams[1]));
        } else if (isCallExpression(callArgument) && isIdentifier(callArgument.callee)) {
          // 处理function(f, ...args){return f(...args)}这种形式
          if (callParams.length == 1) {
            path.replaceWith(callParams[0]);
          } else {
            if (!isExpression(callParams[0])) {
              throw '仅支持第一个参数为函数的形式，如：function(f, ...args){return f(...args)}';
            }
            path.replaceWith(callExpression(callParams[0], callParams.slice(1)));
          }
        }
      }
    },
    MemberExpression (path) {
      const mNode = path.node;
      if (!isIdentifier(mNode.object)) return;
      const tableName = mNode.object.name;
      if (!isStringLiteral(mNode.property)) return;
      const keyName = mNode.property.value;
      if (!(tableName in cffTables) ||
          !(keyName in cffTables[tableName])) return;
      const cffTableValue = cffTables[tableName][keyName];
      path.replaceWith<Node>(cffTableValue);
    }
  });
}

cff(ast);
```

效果（`src/outputs/check_pass_demo_easy_out.js`，可直接运行，弹框`'congratulation!'`）：

```js
function check_pass (password) {
  var v1 = {
    'tPlEX': function (v2, v3) {
      return v2 == v3;
    },
    'TcjYB': function (v4, v5) {
      return v4 + v5;
    },
    'ZtFYf': function (v6, v7) {
      return v6 == v7;
    },
    'tPstu': function (v8, v9) {
      return v8 > v9;
    },
    'Vhxzy': function (v10, v11) {
      return v10 < v11;
    },
    'uuFIS': function (v12, v13) {
      return v12 == v13;
    },
    'cRvgS': function (v14, v15) {
      return v14 ^ v15;
    },
    'GsTse': 'Orz..',
    'ykyBq': 'len error'
  };
  var i = 0;
  var sum = 0;
  for (i = 0;; i++) {
    if (i == password.length) {
      break;
    }
    sum = sum + password.charCodeAt(i);
  }
  if (i == 4) {
    if (sum == 417 && password.charAt(3) > 'c' && password.charAt(3) < 'e' && password.charAt(0) == 'b') {
      if ((password.charCodeAt(3) ^ 13) == password.charCodeAt(1)) {
        return 1;
      }
      console.log('Orz..');
    }
  } else {
    console.log('len error');
  }
  return 0;
}
function test () {
  var v16 = {
    'eOZRR': function (v17, v18) {
      return v17(v18);
    },
    'alzHn': 'bird',
    'GyIol': function (v19, v20) {
      return v19(v20);
    },
    'FWSbx': 'congratulation!',
    'tYizA': 'error!'
  };
  if (check_pass('bird')) {
    alert('congratulation!');
  } else {
    alert('error!');
  }
}
test();
```

### 最后提供一个比较完整的demo

相关的流程：

1. 恢复被隐藏的常量串
2. 去除`Strings Transformations`（常量串隐藏）
3. 识别无用代码并删除（本文没涉及）
4. 去除控制流平坦化
5. 清理常量串隐藏和控制流平坦化带来的无用变量
6. MemberExpression Array Notation转Dot Notation
7. 重命名变量
8. 还原不直观的编码字符串或数值
9. ……

`src/switch_cff_demo.ts`的骨架基本上和`src/check_pass_demo.ts`类似，只不过更完善。这表明我的代码有一定的通用性。[src/switch_cff_demo.ts](https://github.com/Hans774882968/control-flow-flattening-remove-public/blob/main/src/switch_cff_demo.ts)：

```ts
import * as parser from '@babel/parser';
import { renameVars } from './rename_vars';
import generator from '@babel/generator';
import { getFile, writeOutputToFile } from './file_utils';
import { memberExpComputedToFalse } from './member_exp_computed_to_false';
import { translateLiteral } from './translate_literal';
import traverse from '@babel/traverse';
import {
  Node,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
  isObjectProperty,
  isStringLiteral,
  isFunctionExpression,
  isReturnStatement,
  isBinaryExpression,
  binaryExpression,
  isLogicalExpression,
  logicalExpression,
  isCallExpression,
  callExpression,
  isExpression,
  isNumericLiteral,
  stringLiteral,
  isBlockStatement,
  isSwitchStatement,
  isVariableDeclarator,
  isContinueStatement,
  Statement,
  isUpdateExpression
} from '@babel/types';

const jsCode = getFile('src/inputs/switch_cff_demo.js');
const ast = parser.parse(jsCode);

// 如果常量表不止1处，则此代码不正确
function restoreStringLiteral (ast: Node, stringLiteralFuncs: string[], getStringArr: (idx: number) => string) {
  // 收集与常量串隐藏有关的变量
  traverse(ast, {
    VariableDeclarator (path) {
      const vaNode = path.node;
      if (!isIdentifier(vaNode.init) || !isIdentifier(vaNode.id)) return;
      if (stringLiteralFuncs.includes(vaNode.init.name)) {
        stringLiteralFuncs.push(vaNode.id.name);
      }
    }
  });
  traverse(ast, {
    CallExpression (path) {
      const cNode = path.node;
      if (!isIdentifier(cNode.callee)) return;
      const varName = cNode.callee.name;
      if (!stringLiteralFuncs.includes(varName)) return;
      if (cNode.arguments.length !== 1 || !isNumericLiteral(cNode.arguments[0])) return;
      const idx = cNode.arguments[0].value;
      path.replaceWith(stringLiteral(getStringArr(idx)));
    }
  });
}
restoreStringLiteral(ast, ['_0x27c4'], (idx: number) => {
  return ['661835nuUXrL', 'dKifE', 'try again', 'log', '7aEbwep', 'awvtQ', '2804302XtaWgC', 'rmnID', 'flag{hans}', '21393471OyFTzd', 'lXUhG', '1914456NQDFwp', '1xRwaZJ', '36ZbcbZP', '3gJgrjU', '8162226GwaJpl', '3|4|2|0|5|1', 'split', 'charCodeAt', 'pass', '6278120IHpVNF', 'W_PTJ[P]BN', 'length', 'fromCharCode', '939280gOLaZV'][idx - 0x89];
});

function cff (ast: Node) {
  type ASTNodeMap = {[key: string]: Node}
  const cffTables: {[key: string]: ASTNodeMap} = {};
  traverse(ast, {
    VariableDeclarator (path) {
      const node = path.node;
      if (!node.id || !isIdentifier(node.id)) return;
      const tableName = node.id.name;
      if (!isObjectExpression(node.init)) return;
      const tableProperties = node.init.properties;
      cffTables[tableName] = tableProperties.reduce((cffTable, tableProperty) => {
        if (!isObjectProperty(tableProperty) ||
           !isStringLiteral(tableProperty.key)) return cffTable;
        cffTable[tableProperty.key.value] = tableProperty.value;
        return cffTable;
      }, {} as ASTNodeMap);
    }
  });

  traverse(ast, {
    CallExpression (path) {
      const cNode = path.node;
      if (isMemberExpression(cNode.callee)) {
        if (!isIdentifier(cNode.callee.object)) return;
        const callParams = cNode.arguments;
        const tableName = cNode.callee.object.name;
        if (!isStringLiteral(cNode.callee.property)) return;
        const keyName = cNode.callee.property.value;
        if (!(tableName in cffTables) ||
            !(keyName in cffTables[tableName])) return;
        const shouldBeFuncValue = cffTables[tableName][keyName];
        if (!isFunctionExpression(shouldBeFuncValue) ||
            !shouldBeFuncValue.body.body.length ||
            !isReturnStatement(shouldBeFuncValue.body.body[0])) return;
        // 拿到返回值
        const callArgument = shouldBeFuncValue.body.body[0].argument;
        if (isBinaryExpression(callArgument) && callParams.length === 2) {
          if (!isExpression(callParams[0]) || !isExpression(callParams[1])) {
            throw '二元运算符中，两个参数都应为表达式';
          }
          // 处理function(x, y){return x + y}这种形式
          path.replaceWith(binaryExpression(callArgument.operator, callParams[0], callParams[1]));
        } else if (isLogicalExpression(callArgument) && callParams.length === 2) {
          if (!isExpression(callParams[0]) || !isExpression(callParams[1])) {
            throw '逻辑运算符中，两个参数都应为表达式';
          }
          // 处理function(x, y){return x > y}这种形式
          path.replaceWith(logicalExpression(callArgument.operator, callParams[0], callParams[1]));
        } else if (isCallExpression(callArgument) && isIdentifier(callArgument.callee)) {
          // 处理function(f, ...args){return f(...args)}这种形式
          if (callParams.length == 1) {
            path.replaceWith(callParams[0]);
          } else {
            if (!isExpression(callParams[0])) {
              throw '仅支持第一个参数为函数的形式，如：function(f, ...args){return f(...args)}';
            }
            path.replaceWith(callExpression(callParams[0], callParams.slice(1)));
          }
        }
      }
    },
    MemberExpression (path) {
      const mNode = path.node;
      if (!isIdentifier(mNode.object)) return;
      const tableName = mNode.object.name;
      if (!isStringLiteral(mNode.property)) return;
      const keyName = mNode.property.value;
      if (!(tableName in cffTables) ||
          !(keyName in cffTables[tableName])) return;
      const cffTableValue = cffTables[tableName][keyName];
      path.replaceWith<Node>(cffTableValue);
    }
  });
}
cff(ast);

function switchCFF (ast: Node) {
  traverse(ast, {
    WhileStatement (path) {
      const wNode = path.node;
      if (!isBlockStatement(wNode.body) || !wNode.body.body.length) return;
      const switchNode = wNode.body.body[0];
      if (!isSwitchStatement(switchNode)) return;
      const { discriminant, cases } = switchNode;
      if (!isMemberExpression(discriminant) ||
          !isIdentifier(discriminant.object)) return;
      // switch语句内的控制流平坦化数组名，本例中是 _0x31ce85
      const arrayName = discriminant.object.name;
      // 获取控制流平坦化数组绑定的节点
      const bindingArray = path.scope.getBinding(arrayName);
      if (!bindingArray) return;
      // 经过restoreStringLiteral，我们认为它已经恢复为'v1|v2...'['split']('|')
      if (!isVariableDeclarator(bindingArray.path.node) ||
          !isCallExpression(bindingArray.path.node.init)) return;
      const varInit = bindingArray.path.node.init;
      if (!isMemberExpression(varInit.callee) ||
          !isStringLiteral(varInit.callee.object) ||
          varInit.arguments.length !== 1 ||
          !isStringLiteral(varInit.arguments[0])) return;
      const object = varInit.callee.object.value;
      const propty = varInit.callee.property;
      if (!isStringLiteral(propty) && !isIdentifier(propty)) return;
      const propertyName = isStringLiteral(propty) ? propty.value : propty.name;
      const splitArg = varInit.arguments[0].value;
      // 目前只支持'v1|v2...'.split('|')的解析
      if (propertyName !== 'split') {
        console.warn('switchCFF(ast)：目前只支持\'v1|v2...\'.split(\'|\')的解析');
        return;
      }
      const indexArr = object[propertyName](splitArg);

      const replaceBody = indexArr.reduce((replaceBody, index) => {
        const caseBody = cases[+index].consequent;
        if (isContinueStatement(caseBody[caseBody.length - 1])) {
          caseBody.pop();
        }
        return replaceBody.concat(caseBody);
      }, [] as Statement[]);
      path.replaceInline(replaceBody);

      // 可选择的操作：删除控制流平坦化数组绑定的节点、自增变量名绑定的节点
      if (!isUpdateExpression(discriminant.property) ||
          !isIdentifier(discriminant.property.argument)) return;
      const autoIncrementName = discriminant.property.argument.name;
      const bindingAutoIncrement = path.scope.getBinding(autoIncrementName);
      if (!bindingAutoIncrement) return;
      bindingArray.path.remove();
      bindingAutoIncrement.path.remove();
    }
  });
}
switchCFF(ast);

function removeStringTransCodes (ast: Node) {
  traverse(ast, {
    // 去除给string数组进行随机移位的自执行函数
    CallExpression (path) {
      if (!isFunctionExpression(path.node.callee)) return;
      if (path.node.arguments.length !== 2 ||
          !isNumericLiteral(path.node.arguments[1]) ||
          path.node.arguments[1].value !== 0xdbab3) return;
      path.remove();
    },
    // 去除给string数组进行随机移位的函数
    FunctionDeclaration (path) {
      if (!isIdentifier(path.node.id)) return;
      const funcName = path.node.id.name;
      if (!['_0x27c4', '_0x379e'].includes(funcName)) return;
      path.remove();
    },
    // 去除控制流平坦化的哈希表和用于隐藏常量串的变量
    VariableDeclarator (path) {
      if (!isIdentifier(path.node.id)) return;
      const varName = path.node.id.name;
      // 控制流平坦化的哈希表和用于隐藏常量串的变量
      if (!['_0x550d17', '_0x55bea2', '_0x47f9f1'].includes(varName)) return;
      path.remove();
    }
  });
}
removeStringTransCodes(ast);

memberExpComputedToFalse(ast);
renameVars(
  ast,
  (name:string) => name.substring(0, 3) === '_0x',
  {
    enc: 'enc', _0x263396: 'i', _0x13adf6: 'out'
  }
);
translateLiteral(ast);

const { code } = generator(ast);
writeOutputToFile('switch_cff_demo_out.js', code);
```

解混淆前：

```js
var _0x47f9f1 = _0x27c4;
(function (_0x47124a, _0x19f73e) {
  var _0x3b6574 = _0x27c4,
    _0x2c307d = _0x47124a();
  while ([]) {
    try {
      var _0x585cd6 = parseInt(_0x3b6574(0x95)) / 0x1 * (parseInt(_0x3b6574(0x8f)) / 0x2) + -parseInt(_0x3b6574(0x97)) / 0x3 * (parseInt(_0x3b6574(0x9d)) / 0x4) + -parseInt(_0x3b6574(0x89)) / 0x5 + -parseInt(_0x3b6574(0x98)) / 0x6 + -parseInt(_0x3b6574(0x8d)) / 0x7 * (-parseInt(_0x3b6574(0x94)) / 0x8) + parseInt(_0x3b6574(0x96)) / 0x9 * (parseInt(_0x3b6574(0xa1)) / 0xa) + parseInt(_0x3b6574(0x92)) / 0xb;
      if (_0x585cd6 === _0x19f73e) break;
      else _0x2c307d['push'](_0x2c307d['shift']());
    } catch (_0x28b17f) {
      _0x2c307d['push'](_0x2c307d['shift']());
    }
  }
}(_0x379e, 0xdbab3));

function _0x27c4 (_0x122105, _0x24f040) {
  var _0x379e52 = _0x379e();
  return _0x27c4 = function (_0x27c4d4, _0x569919) {
    _0x27c4d4 = _0x27c4d4 - 0x89;
    var _0x5dfb85 = _0x379e52[_0x27c4d4];
    return _0x5dfb85;
  }, _0x27c4(_0x122105, _0x24f040);
}

function _0x379e () {
  var _0x3ed6e2 = ['1914456NQDFwp', '1xRwaZJ', '36ZbcbZP', '3gJgrjU', '8162226GwaJpl', '3|4|2|0|5|1', 'split', 'charCodeAt', 'pass', '6278120IHpVNF', 'W_PTJ[P]BN', 'length', 'fromCharCode', '939280gOLaZV', '661835nuUXrL', 'dKifE', 'try\x20again', 'log', '7aEbwep', 'awvtQ', '2804302XtaWgC', 'rmnID', 'flag{hans}', '21393471OyFTzd', 'lXUhG'];
  _0x379e = function () {
    return _0x3ed6e2;
  };
  return _0x379e();
}

function enc (_0x3bf54e) {
  var _0x55bea2 = _0x27c4,
    _0x550d17 = {
      'dKifE': _0x55bea2(0x99),
      'lXUhG': function (_0x7a78d6, _0x13ee42) {
        return _0x7a78d6 < _0x13ee42;
      },
      'rmnID': function (_0x28f0fb, _0x77896d) {
        return _0x28f0fb & _0x77896d;
      },
      'awvtQ': function (_0x26b565, _0x3ffc0b) {
        return _0x26b565 ^ _0x3ffc0b;
      }
    },
    _0x31ce85 = _0x550d17[_0x55bea2(0x8a)][_0x55bea2(0x9a)]('|'),
    _0x1ffdde = 0x0;
  while ([]) {
    switch (_0x31ce85[_0x1ffdde++]) {
      case '0':
        _0x263396 += 0x1;
        continue;
      case '1':
        return _0x13adf6;
      case '2':
        var _0x13adf6 = '';
        continue;
      case '3':
        var _0x263396 = 0x0;
        continue;
      case '4':
        _0x263396 += -0x1;
        continue;
      case '5':
        for (; _0x550d17[_0x55bea2(0x93)](_0x263396, _0x3bf54e[_0x55bea2(0x9f)]); ++_0x263396) {
          var _0x494484 = 0x0;
          if (_0x550d17[_0x55bea2(0x90)](_0x263396, 0x1)) _0x494484 = 0x33;
          else _0x494484 = 0x31;
          _0x13adf6 += String[_0x55bea2(0xa0)](_0x550d17[_0x55bea2(0x8e)](_0x3bf54e[_0x263396][_0x55bea2(0x9b)](), _0x494484));
        }
        continue;
    }
    break;
  }
}
if (enc(_0x47f9f1(0x91)) === _0x47f9f1(0x9e)) console[_0x47f9f1(0x8c)](_0x47f9f1(0x9c));
else console[_0x47f9f1(0x8c)](_0x47f9f1(0x8b));
```

解混淆后：

```js
function enc (v1) {
  var i = 0;
  i += -1;
  var out = '';
  i += 1;
  for (; i < v1.length; ++i) {
    var v2 = 0;
    if (i & 1) v2 = 51;else v2 = 49;
    out += String.fromCharCode(v1[i].charCodeAt() ^ v2);
  }
  return out;
}
if (enc('flag{hans}') === 'W_PTJ[P]BN') console.log('pass');else console.log('try again');
```

完美还原！

### 参考资料

1. npm package.json scripts 传递参数的解决方案：https://juejin.cn/post/7032919800662016031
2. node执行shell命令：https://www.jianshu.com/p/c0d31513953a
3. IDEA配置eslint：https://blog.csdn.net/weixin_33850015/article/details/91369049
4. 利用AST对抗js混淆(三) 控制流平坦化(Control Flow Flattening)的处理：https://blog.csdn.net/lacoucou/article/details/113665767
5. Babel AST节点介绍：https://www.jianshu.com/p/4f27f4aa576f
6. Babel还原不直观的编码字符串或数值：https://lzc6244.github.io/2021/07/28/Babel%E8%BF%98%E5%8E%9F%E4%B8%8D%E7%9B%B4%E8%A7%82%E7%9A%84%E7%BC%96%E7%A0%81%E5%AD%97%E7%AC%A6%E4%B8%B2%E6%88%96%E6%95%B0%E5%80%BC.html
7. AST在js逆向中switch-case反控制流平坦化：https://blog.csdn.net/Python_DJ/article/details/126882432
8. Jest官方文档：https://jestjs.io/zh-Hans/docs/getting-started#%E4%BD%BF%E7%94%A8-typescript

## 用AST处理混淆代码的流程总结

1. 恢复被隐藏的常量串
2. 识别无用代码并删除（本文没涉及）
3. 去除控制流平坦化
4. 清理常量串隐藏和控制流平坦化带来的无用变量
5. MemberExpression Array Notation转Dot Notation
6. 重命名变量
7. 还原不直观的编码字符串或数值
8. ……

把上面的例子串联起来，我们可以写出

`src/inputs/check_pass_demo.js`（添加Strings Transformations的`String Array, String Array Rotate, String Array Shuffle`、控制流平坦化）：

```js
(function (_0x1f23fa, _0x502274) {var _0x1841e6 = _0x546b, _0x54332a = _0x1f23fa();while ([]) {try {var _0x37b83c = -parseInt(_0x1841e6(0x72)) / 0x1 + parseInt(_0x1841e6(0x73)) / 0x2 * (-parseInt(_0x1841e6(0x7c)) / 0x3) + parseInt(_0x1841e6(0x88)) / 0x4 * (parseInt(_0x1841e6(0x89)) / 0x5) + -parseInt(_0x1841e6(0x71)) / 0x6 + parseInt(_0x1841e6(0x6c)) / 0x7 * (-parseInt(_0x1841e6(0x85)) / 0x8) + -parseInt(_0x1841e6(0x82)) / 0x9 + -parseInt(_0x1841e6(0x7e)) / 0xa * (-parseInt(_0x1841e6(0x78)) / 0xb);if (_0x37b83c === _0x502274) break;else _0x54332a['push'](_0x54332a['shift']());} catch (_0x258ebb) {_0x54332a['push'](_0x54332a['shift']());}}}(_0x3ddf, 0x20d95));function check_pass (_0xaa86db) {var _0x583e52 = _0x546b, _0xd90ee7 = { 'ZlkIH': function (_0x132a5a, _0x451a83) {return _0x132a5a == _0x451a83;}, 'ualDk': function (_0x433e80, _0x19c73c) {return _0x433e80 + _0x19c73c;}, 'PjAeQ': function (_0x46730a, _0x28299e) {return _0x46730a == _0x28299e;}, 'Vwtjq': function (_0x201e8b, _0x48c7c0) {return _0x201e8b == _0x48c7c0;}, 'nThKq': function (_0x359f03, _0x3c0e47) {return _0x359f03 > _0x3c0e47;}, 'ewhZd': function (_0x391fc4, _0x22f89a) {return _0x391fc4 < _0x22f89a;}, 'DpUmp': function (_0x233e7b, _0x51262e) {return _0x233e7b == _0x51262e;}, 'Ajnur': function (_0x49956e, _0x3c20da) {return _0x49956e == _0x3c20da;}, 'RHSOY': function (_0x43a3b0, _0x3a7f38) {return _0x43a3b0 ^ _0x3a7f38;}, 'FdUfK': _0x583e52(0x70), 'XmvLm': _0x583e52(0x6e) }, _0x39ead2 = 0x0, _0x2ce438 = 0x0;for (_0x39ead2 = 0x0;;_0x39ead2++) {if (_0xd90ee7['ZlkIH'](_0x39ead2, _0xaa86db[_0x583e52(0x75)])) break;_0x2ce438 = _0xd90ee7[_0x583e52(0x8a)](_0x2ce438, _0xaa86db[_0x583e52(0x7a)](_0x39ead2));} if (_0xd90ee7[_0x583e52(0x83)](_0x39ead2, 0x4)) {if (_0xd90ee7[_0x583e52(0x77)](_0x2ce438, 0x1a1) && _0xd90ee7['nThKq'](_0xaa86db[_0x583e52(0x81)](0x3), 'c') && _0xd90ee7[_0x583e52(0x84)](_0xaa86db[_0x583e52(0x81)](0x3), 'e') && _0xd90ee7[_0x583e52(0x87)](_0xaa86db[_0x583e52(0x81)](0x0), 'b')) {if (_0xd90ee7[_0x583e52(0x7d)](_0xd90ee7[_0x583e52(0x8b)](_0xaa86db[_0x583e52(0x7a)](0x3), 0xd), _0xaa86db[_0x583e52(0x7a)](0x1))) return 0x1;console[_0x583e52(0x8c)](_0xd90ee7[_0x583e52(0x7b)]);}} else console[_0x583e52(0x8c)](_0xd90ee7[_0x583e52(0x6f)]);return 0x0;} function test () {var _0x583af1 = _0x546b, _0x2d1e4f = { 'shrai': function (_0x442c79, _0x5d5a4e) {return _0x442c79(_0x5d5a4e);}, 'FhQZn': 'bird', 'KUTlo': function (_0x32455c, _0x4d5b8f) {return _0x32455c(_0x4d5b8f);}, 'Fhqhk': _0x583af1(0x86), 'KclRu': _0x583af1(0x6d) };_0x2d1e4f[_0x583af1(0x74)](check_pass, _0x2d1e4f[_0x583af1(0x79)]) ? _0x2d1e4f[_0x583af1(0x76)](alert, _0x2d1e4f[_0x583af1(0x80)]) : _0x2d1e4f[_0x583af1(0x76)](alert, _0x2d1e4f[_0x583af1(0x7f)]);} function _0x546b (_0x280dd3, _0x383a2d) {var _0x3ddf54 = _0x3ddf();return _0x546b = function (_0x546b3f, _0x142ae2) {_0x546b3f = _0x546b3f - 0x6c;var _0x233a8a = _0x3ddf54[_0x546b3f];return _0x233a8a;}, _0x546b(_0x280dd3, _0x383a2d);}test();function _0x3ddf () {var _0x45c37a = ['30037Sxrenc', 'error!', 'len\x20error', 'XmvLm', 'Orz..', '1159374JpqDju', '267734qPEpMO', '364750QkecUn', 'shrai', 'length', 'KUTlo', 'Vwtjq', '99juDGtv', 'FhQZn', 'charCodeAt', 'FdUfK', '3tSVDal', 'Ajnur', '874980MJshmD', 'KclRu', 'Fhqhk', 'charAt', '187074oiwMPp', 'PjAeQ', 'ewhZd', '328PNtXbI', 'congratulation!', 'DpUmp', '57576xxZPaZ', '65fmhmYN', 'ualDk', 'RHSOY', 'log'];_0x3ddf = function () {return _0x45c37a;};return _0x3ddf();}
```

的还原代码`src/check_pass_demo.ts`：

```ts
import * as parser from '@babel/parser';
import { renameVars } from './rename_vars';
import generator from '@babel/generator';
import { getFile, writeOutputToFile } from './file_utils';
import { memberExpComputedToFalse } from './member_exp_computed_to_false';
import { translateLiteral } from './translate_literal';
import traverse from '@babel/traverse';
import {
  Node,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
  isObjectProperty,
  isStringLiteral,
  isFunctionExpression,
  isReturnStatement,
  isBinaryExpression,
  binaryExpression,
  isLogicalExpression,
  logicalExpression,
  isCallExpression,
  callExpression,
  isExpression,
  isNumericLiteral,
  stringLiteral
} from '@babel/types';

const jsCode = getFile('src/inputs/check_pass_demo.js');
const ast = parser.parse(jsCode);

function restoreStringLiteral (ast: Node, getStringArr: (idx: number) => string) {
  // 如果常量表不止1处，则此代码不正确
  const stringLiteralFuncs = ['_0x546b'];
  // 收集与常量串隐藏有关的变量
  traverse(ast, {
    VariableDeclarator (path) {
      const vaNode = path.node;
      if (!isIdentifier(vaNode.init) || !isIdentifier(vaNode.id)) return;
      if (stringLiteralFuncs.includes(vaNode.init.name)) {
        stringLiteralFuncs.push(vaNode.id.name);
      }
    }
  });
  traverse(ast, {
    CallExpression (path) {
      const cNode = path.node;
      if (!isIdentifier(cNode.callee)) return;
      const varName = cNode.callee.name;
      if (!stringLiteralFuncs.includes(varName)) return;
      if (cNode.arguments.length !== 1 || !isNumericLiteral(cNode.arguments[0])) return;
      const idx = cNode.arguments[0].value;
      path.replaceWith(stringLiteral(getStringArr(idx)));
    }
  });
}
restoreStringLiteral(ast, (idx: number) => {
  return ['30037Sxrenc', 'error!', 'len\x20error', 'XmvLm', 'Orz..', '1159374JpqDju', '267734qPEpMO', '364750QkecUn', 'shrai', 'length', 'KUTlo', 'Vwtjq', '99juDGtv', 'FhQZn', 'charCodeAt', 'FdUfK', '3tSVDal', 'Ajnur', '874980MJshmD', 'KclRu', 'Fhqhk', 'charAt', '187074oiwMPp', 'PjAeQ', 'ewhZd', '328PNtXbI', 'congratulation!', 'DpUmp', '57576xxZPaZ', '65fmhmYN', 'ualDk', 'RHSOY', 'log'][idx - 108];
});

function cff (ast: Node) {
  type ASTNodeMap = {[key: string]: Node}
  const cffTables: {[key: string]: ASTNodeMap} = {};
  traverse(ast, {
    VariableDeclarator (path) {
      const node = path.node;
      if (!node.id || !isIdentifier(node.id)) return;
      const tableName = node.id.name;
      if (!isObjectExpression(node.init)) return;
      const tableProperties = node.init.properties;
      cffTables[tableName] = tableProperties.reduce((cffTable, tableProperty) => {
        if (!isObjectProperty(tableProperty) ||
           !isStringLiteral(tableProperty.key)) return cffTable;
        cffTable[tableProperty.key.value] = tableProperty.value;
        return cffTable;
      }, {} as ASTNodeMap);
    }
  });

  traverse(ast, {
    CallExpression (path) {
      const cNode = path.node;
      if (isMemberExpression(cNode.callee)) {
        if (!isIdentifier(cNode.callee.object)) return;
        const callParams = cNode.arguments;
        const tableName = cNode.callee.object.name;
        if (!isStringLiteral(cNode.callee.property)) return;
        const keyName = cNode.callee.property.value;
        if (!(tableName in cffTables) ||
            !(keyName in cffTables[tableName])) return;
        const shouldBeFuncValue = cffTables[tableName][keyName];
        if (!isFunctionExpression(shouldBeFuncValue) ||
            !shouldBeFuncValue.body.body.length ||
            !isReturnStatement(shouldBeFuncValue.body.body[0])) return;
        // 拿到返回值
        const callArgument = shouldBeFuncValue.body.body[0].argument;
        if (isBinaryExpression(callArgument) && callParams.length === 2) {
          if (!isExpression(callParams[0]) || !isExpression(callParams[1])) {
            throw '二元运算符中，两个参数都应为表达式';
          }
          // 处理function(x, y){return x + y}这种形式
          path.replaceWith(binaryExpression(callArgument.operator, callParams[0], callParams[1]));
        } else if (isLogicalExpression(callArgument) && callParams.length === 2) {
          if (!isExpression(callParams[0]) || !isExpression(callParams[1])) {
            throw '逻辑运算符中，两个参数都应为表达式';
          }
          // 处理function(x, y){return x > y}这种形式
          path.replaceWith(logicalExpression(callArgument.operator, callParams[0], callParams[1]));
        } else if (isCallExpression(callArgument) && isIdentifier(callArgument.callee)) {
          // 处理function(f, ...args){return f(...args)}这种形式
          if (callParams.length == 1) {
            path.replaceWith(callParams[0]);
          } else {
            if (!isExpression(callParams[0])) {
              throw '仅支持第一个参数为函数的形式，如：function(f, ...args){return f(...args)}';
            }
            path.replaceWith(callExpression(callParams[0], callParams.slice(1)));
          }
        }
      }
    },
    MemberExpression (path) {
      const mNode = path.node;
      if (!isIdentifier(mNode.object)) return;
      const tableName = mNode.object.name;
      if (!isStringLiteral(mNode.property)) return;
      const keyName = mNode.property.value;
      if (!(tableName in cffTables) ||
          !(keyName in cffTables[tableName])) return;
      const cffTableValue = cffTables[tableName][keyName];
      path.replaceWith<Node>(cffTableValue);
    }
  });
}
cff(ast);

function removeUselessCodes (ast: Node) {
  traverse(ast, {
    // 去除给string数组进行随机移位的自执行函数
    CallExpression (path) {
      if (!isFunctionExpression(path.node.callee)) return;
      if (path.node.arguments.length !== 2 ||
          !isNumericLiteral(path.node.arguments[1]) ||
          path.node.arguments[1].value !== 0x20d95) return;
      path.remove();
    },
    // 去除给string数组进行随机移位的函数
    FunctionDeclaration (path) {
      if (!isIdentifier(path.node.id)) return;
      const funcName = path.node.id.name;
      if (!['_0x546b', '_0x3ddf'].includes(funcName)) return;
      path.remove();
    },
    // 去除控制流平坦化的哈希表和用于隐藏常量串的变量
    VariableDeclarator (path) {
      if (!isIdentifier(path.node.id)) return;
      const varName = path.node.id.name;
      // 前两个变量是控制流平坦化的哈希表，后两个是用于隐藏常量串的变量
      if (!['_0xd90ee7', '_0x2d1e4f', '_0x583e52', '_0x583af1'].includes(varName)) return;
      path.remove();
    }
  });
}
removeUselessCodes(ast);

memberExpComputedToFalse(ast);
renameVars(
  ast,
  (name:string) => name.substring(0, 3) === '_0x',
  {
    check_pass: 'check_pass', test: 'test', _0x39ead2: 'i',
    _0x2ce438: 'sum', _0xaa86db: 'password'
  }
);
translateLiteral(ast);

const { code } = generator(ast);
writeOutputToFile('check_pass_demo_out.js', code);
```

还原效果（完美！）：

```js
function check_pass (password) {
  var i = 0,
    sum = 0;
  for (i = 0;; i++) {
    if (i == password.length) break;
    sum = sum + password.charCodeAt(i);
  }
  if (i == 4) {
    if (sum == 417 && password.charAt(3) > 'c' && password.charAt(3) < 'e' && password.charAt(0) == 'b') {
      if ((password.charCodeAt(3) ^ 13) == password.charCodeAt(1)) return 1;
      console.log('Orz..');
    }
  } else console.log('len error');
  return 0;
}
function test () {
  check_pass('bird') ? alert('congratulation!') : alert('error!');
}
test();
```

