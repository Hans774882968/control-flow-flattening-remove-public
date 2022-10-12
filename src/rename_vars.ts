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
