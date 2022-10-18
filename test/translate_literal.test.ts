import { translateLiteral } from '../src/translate_literal';
import * as parser from '@babel/parser';
import generator from '@babel/generator';

test('Unicode Escape Sequence', () => {
  const jsCode = 'const s=\'\x66\x6c\x61\x67\x7b\u522b\u5b66\u4e86\uff0c\u7761\u5927\u89c9\u53bb\uff01\x7d\';';
  const expected = 'const s = \'flag{别学了，睡大觉去！}\';';
  const ast = parser.parse(jsCode);
  translateLiteral(ast);
  const { code: res } = generator(ast);
  expect(res).toBe(expected);
});

// 目前translateLiteral不支持010 = 8的识别
test('Numbers', () => {
  const jsCode = 'const v = 0x31 + 0o10 + 0b100 + 2;';
  const expected = 'const v = 49 + 8 + 4 + 2;';
  const ast = parser.parse(jsCode);
  translateLiteral(ast);
  const { code: res } = generator(ast);
  expect(res).toBe(expected);
});
