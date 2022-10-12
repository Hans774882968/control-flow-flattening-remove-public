import traverse from '@babel/traverse';
import { stringLiteral, Node } from '@babel/types';

export function translateLiteral (ast: Node) {
  traverse(ast, {
    NumericLiteral (path) {
      const node = path.node;
      // 直接去除node.extra即可
      if (node.extra && /^0[obx]/i.test(node.extra.raw as string)) {
        node.extra = undefined;
      }
    },
    StringLiteral (path) {
      const node = path.node;
      if (node.extra && /\\[ux]/gi.test(node.extra.raw as string)) {
        let nodeValue = '';
        try {
          nodeValue = decodeURIComponent(escape(node.value));
        } catch (error) {
          nodeValue = node.value;
        }
        path.replaceWith(stringLiteral(nodeValue));
        path.node.extra = {
          'raw': JSON.stringify(nodeValue),
          'rawValue': nodeValue
        };
      }
    }
  });
}
