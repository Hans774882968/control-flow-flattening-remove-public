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

### 处理控制流平坦化

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

在[这个网站](https://obfuscator.io/)中使用如下选项加密：`Control Flow Flattening`，`Control Flow Flattening Threshold`选择1，注意不要让网站隐藏常量串，因为我们这个版本的脚本还不支持。得到的代码如`src/inputs/check_pass_demo_easy.js`所示：

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

参考链接4先遍历了控制流平坦化的哈希表的每一个键值对，然后对每个键值对都完整遍历一遍树。这个时间复杂度不太好。我们可以进行预处理（相关的数据结构`cffTables`，类型为`{[key: string]: {[key: string]: Node}}`），然后通过`cffTables[tableName][keyName]`来访问所需的`Node`。具体见`src/check_pass_demo.ts`。这样我们就只需要遍历树两次了。

#### 代码

完整代码见`src/check_pass_demo.ts`：

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

### 参考资料

1. npm package.json scripts 传递参数的解决方案：https://juejin.cn/post/7032919800662016031
2. node执行shell命令：https://www.jianshu.com/p/c0d31513953a
3. IDEA配置eslint：https://blog.csdn.net/weixin_33850015/article/details/91369049
4. 利用AST对抗js混淆(三) 控制流平坦化(Control Flow Flattening)的处理：https://blog.csdn.net/lacoucou/article/details/113665767
5. Babel AST节点介绍：https://www.jianshu.com/p/4f27f4aa576f
6. Babel还原不直观的编码字符串或数值：https://lzc6244.github.io/2021/07/28/Babel%E8%BF%98%E5%8E%9F%E4%B8%8D%E7%9B%B4%E8%A7%82%E7%9A%84%E7%BC%96%E7%A0%81%E5%AD%97%E7%AC%A6%E4%B8%B2%E6%88%96%E6%95%B0%E5%80%BC.html