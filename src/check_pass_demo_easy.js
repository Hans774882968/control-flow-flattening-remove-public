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
const jsCode = (0, file_utils_1.getFile)('src/inputs/check_pass_demo_easy.js');
const ast = parser.parse(jsCode);
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
(0, member_exp_computed_to_false_1.memberExpComputedToFalse)(ast);
(0, rename_vars_1.renameVars)(ast, (name) => name.substring(0, 3) === '_0x', {
  check_pass: 'check_pass', test: 'test', _0x537fc8: 'i',
  _0x3df4b0: 'sum', _0x57a7be: 'password'
});
(0, translate_literal_1.translateLiteral)(ast);
const { code } = (0, generator_1.default)(ast);
(0, file_utils_1.writeOutputToFile)('check_pass_demo_easy_out.js', code);
