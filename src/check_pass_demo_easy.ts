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
  isExpression
} from '@babel/types';

const jsCode = getFile('src/inputs/check_pass_demo_easy.js');
const ast = parser.parse(jsCode);

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
memberExpComputedToFalse(ast);
renameVars(
  ast,
  (name:string) => name.substring(0, 3) === '_0x',
  {
    check_pass: 'check_pass', test: 'test', _0x537fc8: 'i',
    _0x3df4b0: 'sum', _0x57a7be: 'password'
  }
);
translateLiteral(ast);

const { code } = generator(ast);
writeOutputToFile('check_pass_demo_easy_out.js', code);
