'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = { enumerable: true, get: function () { return m[k]; } };
  }
  Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
  Object.defineProperty(o, 'default', { enumerable: true, value: v });
}) : function (o, v) {
  o['default'] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { 'default': mod };
};
Object.defineProperty(exports, '__esModule', { value: true });
const parser = __importStar(require('@babel/parser'));
const rename_vars_1 = require('./rename_vars');
const generator_1 = __importDefault(require('@babel/generator'));
const file_utils_1 = require('./file_utils');
const member_exp_computed_to_false_1 = require('./member_exp_computed_to_false');
const translate_literal_1 = require('./translate_literal');
const traverse_1 = __importDefault(require('@babel/traverse'));
const types_1 = require('@babel/types');
const jsCode = (0, file_utils_1.getFile)('src/inputs/check_pass_demo.js');
const ast = parser.parse(jsCode);
function restoreStringLiteral (ast, getStringArr) {
  // 如果常量表不止1处，则此代码不正确
  const stringLiteralFuncs = ['_0x546b'];
  // 收集与常量串隐藏有关的变量
  (0, traverse_1.default)(ast, {
    VariableDeclarator (path) {
      const vaNode = path.node;
      if (!(0, types_1.isIdentifier)(vaNode.init) || !(0, types_1.isIdentifier)(vaNode.id))
        return;
      if (stringLiteralFuncs.includes(vaNode.init.name)) {
        stringLiteralFuncs.push(vaNode.id.name);
      }
    }
  });
  (0, traverse_1.default)(ast, {
    CallExpression (path) {
      const cNode = path.node;
      if (!(0, types_1.isIdentifier)(cNode.callee))
        return;
      const varName = cNode.callee.name;
      if (!stringLiteralFuncs.includes(varName))
        return;
      if (cNode.arguments.length !== 1 || !(0, types_1.isNumericLiteral)(cNode.arguments[0]))
        return;
      const idx = cNode.arguments[0].value;
      path.replaceWith((0, types_1.stringLiteral)(getStringArr(idx)));
    }
  });
}
restoreStringLiteral(ast, (idx) => {
  return ['30037Sxrenc', 'error!', 'len\x20error', 'XmvLm', 'Orz..', '1159374JpqDju', '267734qPEpMO', '364750QkecUn', 'shrai', 'length', 'KUTlo', 'Vwtjq', '99juDGtv', 'FhQZn', 'charCodeAt', 'FdUfK', '3tSVDal', 'Ajnur', '874980MJshmD', 'KclRu', 'Fhqhk', 'charAt', '187074oiwMPp', 'PjAeQ', 'ewhZd', '328PNtXbI', 'congratulation!', 'DpUmp', '57576xxZPaZ', '65fmhmYN', 'ualDk', 'RHSOY', 'log'][idx - 108];
});
function cff (ast) {
  const cffTables = {};
  (0, traverse_1.default)(ast, {
    VariableDeclarator (path) {
      const node = path.node;
      if (!node.id || !(0, types_1.isIdentifier)(node.id))
        return;
      const tableName = node.id.name;
      if (!(0, types_1.isObjectExpression)(node.init))
        return;
      const tableProperties = node.init.properties;
      cffTables[tableName] = tableProperties.reduce((cffTable, tableProperty) => {
        if (!(0, types_1.isObjectProperty)(tableProperty) ||
                    !(0, types_1.isStringLiteral)(tableProperty.key))
          return cffTable;
        cffTable[tableProperty.key.value] = tableProperty.value;
        return cffTable;
      }, {});
    }
  });
  (0, traverse_1.default)(ast, {
    CallExpression (path) {
      const cNode = path.node;
      if ((0, types_1.isMemberExpression)(cNode.callee)) {
        if (!(0, types_1.isIdentifier)(cNode.callee.object))
          return;
        const callParams = cNode.arguments;
        const tableName = cNode.callee.object.name;
        if (!(0, types_1.isStringLiteral)(cNode.callee.property))
          return;
        const keyName = cNode.callee.property.value;
        if (!(tableName in cffTables) ||
                    !(keyName in cffTables[tableName]))
          return;
        const shouldBeFuncValue = cffTables[tableName][keyName];
        if (!(0, types_1.isFunctionExpression)(shouldBeFuncValue) ||
                    !shouldBeFuncValue.body.body.length ||
                    !(0, types_1.isReturnStatement)(shouldBeFuncValue.body.body[0]))
          return;
        // 拿到返回值
        const callArgument = shouldBeFuncValue.body.body[0].argument;
        if ((0, types_1.isBinaryExpression)(callArgument) && callParams.length === 2) {
          if (!(0, types_1.isExpression)(callParams[0]) || !(0, types_1.isExpression)(callParams[1])) {
            throw '二元运算符中，两个参数都应为表达式';
          }
          // 处理function(x, y){return x + y}这种形式
          path.replaceWith((0, types_1.binaryExpression)(callArgument.operator, callParams[0], callParams[1]));
        }
        else if ((0, types_1.isLogicalExpression)(callArgument) && callParams.length === 2) {
          if (!(0, types_1.isExpression)(callParams[0]) || !(0, types_1.isExpression)(callParams[1])) {
            throw '逻辑运算符中，两个参数都应为表达式';
          }
          // 处理function(x, y){return x > y}这种形式
          path.replaceWith((0, types_1.logicalExpression)(callArgument.operator, callParams[0], callParams[1]));
        }
        else if ((0, types_1.isCallExpression)(callArgument) && (0, types_1.isIdentifier)(callArgument.callee)) {
          // 处理function(f, ...args){return f(...args)}这种形式
          if (callParams.length == 1) {
            path.replaceWith(callParams[0]);
          }
          else {
            if (!(0, types_1.isExpression)(callParams[0])) {
              throw '仅支持第一个参数为函数的形式，如：function(f, ...args){return f(...args)}';
            }
            path.replaceWith((0, types_1.callExpression)(callParams[0], callParams.slice(1)));
          }
        }
      }
    },
    MemberExpression (path) {
      const mNode = path.node;
      if (!(0, types_1.isIdentifier)(mNode.object))
        return;
      const tableName = mNode.object.name;
      if (!(0, types_1.isStringLiteral)(mNode.property))
        return;
      const keyName = mNode.property.value;
      if (!(tableName in cffTables) ||
                !(keyName in cffTables[tableName]))
        return;
      const cffTableValue = cffTables[tableName][keyName];
      path.replaceWith(cffTableValue);
    }
  });
}
cff(ast);
function removeUselessCodes (ast) {
  (0, traverse_1.default)(ast, {
    // 去除给string数组进行随机移位的自执行函数
    CallExpression (path) {
      if (!(0, types_1.isFunctionExpression)(path.node.callee))
        return;
      if (path.node.arguments.length !== 2 ||
                !(0, types_1.isNumericLiteral)(path.node.arguments[1]) ||
                path.node.arguments[1].value !== 0x20d95)
        return;
      path.remove();
    },
    // 去除给string数组进行随机移位的函数
    FunctionDeclaration (path) {
      if (!(0, types_1.isIdentifier)(path.node.id))
        return;
      const funcName = path.node.id.name;
      if (!['_0x546b', '_0x3ddf'].includes(funcName))
        return;
      path.remove();
    },
    // 去除控制流平坦化的哈希表和用于隐藏常量串的变量
    VariableDeclarator (path) {
      if (!(0, types_1.isIdentifier)(path.node.id))
        return;
      const varName = path.node.id.name;
      // 前两个变量是控制流平坦化的哈希表，后两个是用于隐藏常量串的变量
      if (!['_0xd90ee7', '_0x2d1e4f', '_0x583e52', '_0x583af1'].includes(varName))
        return;
      path.remove();
    }
  });
}
removeUselessCodes(ast);
(0, member_exp_computed_to_false_1.memberExpComputedToFalse)(ast);
(0, rename_vars_1.renameVars)(ast, (name) => name.substring(0, 3) === '_0x', {
  check_pass: 'check_pass', test: 'test', _0x39ead2: 'i',
  _0x2ce438: 'sum', _0xaa86db: 'password'
});
(0, translate_literal_1.translateLiteral)(ast);
const { code } = (0, generator_1.default)(ast);
(0, file_utils_1.writeOutputToFile)('check_pass_demo_out.js', code);
