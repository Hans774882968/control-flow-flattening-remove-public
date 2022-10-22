'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { 'default': mod };
};
Object.defineProperty(exports, '__esModule', { value: true });
exports.renameVars = void 0;
const traverse_1 = __importDefault(require('@babel/traverse'));
// 对于全局变量与局部变量同名的情况，这段代码可能是有问题的
function renameVars (ast, canReplace = () => { return true; }, renameMap = {}) {
  const names = new Set();
  (0, traverse_1.default)(ast, {
    Identifier (path) {
      const oldName = path.node.name;
      if (!canReplace(oldName))
        return;
      names.add(oldName);
    }
  });
  let i = 0;
  names.forEach((name) => {
    if (!Object.getOwnPropertyDescriptor(renameMap, name)) {
      renameMap[name] = `v${++i}`;
    }
  });
  (0, traverse_1.default)(ast, {
    Identifier (path) {
      const oldName = path.node.name;
      if (!canReplace(oldName))
        return;
      path.node.name = renameMap[oldName];
    }
  });
}
exports.renameVars = renameVars;
