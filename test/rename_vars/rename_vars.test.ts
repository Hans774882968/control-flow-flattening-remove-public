import * as parser from '@babel/parser';
import generator from '@babel/generator';
import { RenameAlgorithms, renameVars } from '../../src/rename_vars';

describe('rename_vars', () => {
  it('default algo', () => {
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

  it('alphabet algo', () => {
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
  let a = 10,
    C = Array(a).fill(0).map(() => Array(a).fill(0));
  for (let i = 0; i < a; ++i) {
    C[i][0] = 1;
    for (let b = 1; b <= i; ++b) {
      C[i][b] = C[i - 1][b] + C[i - 1][b - 1];
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
      },
      RenameAlgorithms.ALPHABET
    );
    const { code: res } = generator(ast);
    expect(res).toBe(expected);
  });
});
