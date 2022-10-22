import * as parser from '@babel/parser';
import generator from '@babel/generator';
import { renameVars } from '../../src/rename_vars';

test('test1', () => {
  const jsCode = `function f () {
  let _0x1 = 10, _0x2 = Array(_0x1).fill(0).map(() => Array(_0x1).fill(0));
  for (let _0x3 = 0;_0x3 < _0x1;++_0x3) {
    _0x2[_0x3][0] = 1;
    for (let _0x4 = 1;_0x4 <= _0x3;++_0x4) {
      _0x2[_0x3][_0x4] = _0x2[_0x3 - 1][_0x4] + _0x2[_0x3 - 1][_0x4 - 1];
    }
  }
  console.log(_0x2);
}`;
  const expected = `function f() {
  let v1 = 10,
    C = Array(v1).fill(0).map(() => Array(v1).fill(0));
  for (let i = 0; i < v1; ++i) {
    C[i][0] = 1;
    for (let v2 = 1; v2 <= i; ++v2) {
      C[i][v2] = C[i - 1][v2] + C[i - 1][v2 - 1];
    }
  }
  console.log(C);
}`;
  const ast = parser.parse(jsCode);
  renameVars(
    ast,
    (name:string) => name.substring(0, 3) === '_0x',
    {
      _0x2: 'C', _0x3: 'i'
    }
  );
  const { code: res } = generator(ast);
  expect(res).toBe(expected);
});
