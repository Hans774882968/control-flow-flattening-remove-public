import * as parser from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import {
  Statement, WhileStatement, BlockStatement,
  isSwitchStatement, isContinueStatement, isMemberExpression,
  isUpdateExpression, isIdentifier, isVariableDeclaration,
  isCallExpression, isStringLiteral
} from '@babel/types';
import generator from '@babel/generator';
import { getFile, writeOutputToFile } from './file_utils';

const jsCode = getFile('src/inputs/hw.js');
const ast = parser.parse(jsCode);
const decodeWhileOpts = {
  WhileStatement (path: NodePath<WhileStatement>) {
    const { body } = path.node;
    const swithchNode = (body as BlockStatement).body[0];
    if (!isSwitchStatement(swithchNode)) return;
    const { discriminant, cases } = swithchNode;
    // 这里的类型守卫有更优雅的写法么qwq？
    if (!isMemberExpression(discriminant) ||
        !isUpdateExpression(discriminant.property) ||
        !isIdentifier(discriminant.object)) return;
    const arrName = discriminant.object.name;

    // 面向源码编程：希望拿到两个变量声明的节点
    const perBroNode = path.getAllPrevSiblings();
    let arrVal:string[] = [];
    perBroNode.forEach(perNode => {
      const nd = perNode.node;
      if (!isVariableDeclaration(nd)) return;
      const { declarations } = nd;
      const { id, init } = declarations[0];
      // 这里的类型守卫有更优雅的写法么qwq？
      if (!isCallExpression(init) ||
          !isMemberExpression(init.callee) ||
          !isStringLiteral(init.callee.object) ||
          !isIdentifier(id)) return;
      if (arrName === id.name) {
        arrVal = init.callee.object.value.split(',');
      }
    });

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
