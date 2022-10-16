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
