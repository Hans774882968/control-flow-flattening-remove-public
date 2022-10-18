import * as parser from '@babel/parser';
import generator from '@babel/generator';
import { memberExpComputedToFalse } from '../src/member_exp_computed_to_false';
import traverse from '@babel/traverse';
import {
  isIdentifier, Identifier, MemberExpression, isMemberExpression
} from '@babel/types';
import expect from 'expect';

test('Array Notation to Dot Notation', () => {
  const jsCode = `
  const x = obj['xy']['yz'], y = obj['zw'](String['fromCharCode'])
  `;
  const expected = `const x = obj.xy.yz,
  y = obj.zw(String.fromCharCode);`;
  const ast = parser.parse(jsCode);
  memberExpComputedToFalse(ast);
  const { code: res } = generator(ast);

  const astRes = parser.parse(res);
  expect(res).toBe(expected);
  traverse(astRes, {
    MemberExpression (path) {
      const mNode = path.node;
      if (!isIdentifier(mNode.property) || mNode.property.name !== 'yz') return;
      expect(isMemberExpression(mNode.object)).toBeTruthy();
      expect(isIdentifier((mNode.object as MemberExpression).property)).toBeTruthy();
      expect(((mNode.object as MemberExpression).property as Identifier).name).toBe('xy');
    }
  });
});
