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
