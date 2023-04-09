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
  isFunctionExpression,
  isNumericLiteral,
  stringLiteral
} from '@babel/types';
import { switchCFF } from './remove_switch_cff';
import { cff } from './remove_cff';

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

cff(ast);

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
