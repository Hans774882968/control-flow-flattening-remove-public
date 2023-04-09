import {
  isBlockStatement,
  isCallExpression,
  isContinueStatement,
  isIdentifier,
  isMemberExpression,
  isStringLiteral,
  isSwitchStatement,
  isUpdateExpression,
  isVariableDeclarator,
  Node,
  Statement
} from '@babel/types';
import traverse from '@babel/traverse';

export function switchCFF (ast: Node) {
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
