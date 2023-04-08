import traverse, { NodePath } from '@babel/traverse';
import { Identifier, Node } from '@babel/types';

export enum RenameAlgorithms {
  NUMBER,
  ALPHABET,
  UGLIFY_JS
}

const alphabetTable = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$';
export const ALPHABET_TABLE_LENGTH = 63;
const uglifyJSTable = 'etnrisouaflchpdvmgybwESxTNCkLAOM_DPHBjFIqRUzWXV$JKQGYZ0516372984';
export const UGLIFYJS_TABLE_LENGTH = 64;

// 先加一个前缀规避关键字问题
export function uglifyJSStyleName (i: number) {
  --i;
  if (i < 0) {
    throw new Error(`parameter i should be positive (got ${i + 1})`);
  }
  const a = [];
  do {
    a.push(uglifyJSTable[i % UGLIFYJS_TABLE_LENGTH]);
    i = Math.floor(i / UGLIFYJS_TABLE_LENGTH);
  } while (i);
  return `_${a.reverse().join('')}`;
}

// 先加一个前缀规避关键字问题
export function alphabetStyleName (i: number) {
  --i;
  const originalVariableID = i;
  if (i < 0) {
    throw new Error(`parameter i should be positive (got ${i + 1})`);
  }
  const a = [];
  do {
    a.push(alphabetTable[i % ALPHABET_TABLE_LENGTH]);
    i = Math.floor(i / ALPHABET_TABLE_LENGTH);
  } while (i);
  return `${originalVariableID < 52 ? '' : '_'}${a.reverse().join('')}`;
}

// 对于全局变量与局部变量同名的情况，这段代码可能是有问题的
// 另外，重命名以后的变量名也可能与现有代码的变量名冲突。这些问题很棘手，需要学习 terser 等包的源码后才能解决
export function renameVars (
  ast: Node,
  canReplace: (name: string) => boolean = () => {return true;},
  renameMap: {[key: string]: string} = {},
  algorithm: RenameAlgorithms = RenameAlgorithms.NUMBER
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
    if (Object.getOwnPropertyDescriptor(renameMap, name)) {
      return;
    }
    ++i;
    if (algorithm === RenameAlgorithms.NUMBER) {
      renameMap[name] = `v${i}`;
    }
    if (algorithm === RenameAlgorithms.ALPHABET) {
      renameMap[name] = alphabetStyleName(i);
    }
    if (algorithm === RenameAlgorithms.UGLIFY_JS) {
      renameMap[name] = uglifyJSStyleName(i);
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
