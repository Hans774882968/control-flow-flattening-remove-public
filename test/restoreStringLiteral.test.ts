import { autoRestoreStringLiteralViaIIFE, rotateArray } from '../src/restoreStringLiteral';
import * as parser from '@babel/parser';
import generator from '@babel/generator';
import { memberExpComputedToFalse } from '../src/member_exp_computed_to_false';

describe('restoreStringLiteral', () => {
  it('rotateArray', () => {
    expect(rotateArray([2, 3, 4], 1)).toEqual([3, 4, 2]);
    expect(rotateArray([2, 3, 4], 2)).toEqual([4, 2, 3]);
    expect(rotateArray([2, 3, 4], 101)).toEqual([4, 2, 3]);
    expect(rotateArray([2, 3, 4, 5], 3)).toEqual([5, 2, 3, 4]);
  });

  it('autoRestoreStringLiteralViaIIFE', () => {
    const jsCode = `'use strict';

var _0x59e016 = function (_0x2b4d76, _0x47bf96) {
  _0x2b4d76 = _0x2b4d76 - 0x1aa;
  var _0x4230d8 = _0x2066af[_0x2b4d76];
  return _0x4230d8;
}

const _0x2066af = ['531226ubdYEd', '3XZGEKe', '820868WcYxUw', '2802700PNInWZ', '6HbKARe', '343959psojdX', '168912VZzdKH', '10224162fLijZn', '__importDefault', '__esModule', 'defineProperty', 'writeOutputToFile', 'getFile', 'path', 'default', 'readFileSync', 'utf-8', 'resolve', 'src', 'outputs', 'mkdirSync', 'writeFileSync', '83289XfIiLl'];

(function (_0x149720, _0x36191f) {
  var _0x19a768 = function (_0x5065e2) {
    while (--_0x5065e2) {
      _0x149720['push'](_0x149720['shift']());
    }
  };
  _0x19a768(++_0x36191f);
}(_0x2066af, 0x16));

var __importDefault = this && this[_0x59e016(0x1b3)] || function(_0x50a342) {
  const _0x3f7f84 = _0x59e016;
  return _0x50a342 && _0x50a342[_0x3f7f84(0x1b4)] ? _0x50a342 : {
    'default': _0x50a342
  };
};
Object[_0x59e016(0x1b5)](exports, _0x59e016(0x1b4), {
  'value': !![]
}), exports[_0x59e016(0x1b6)] = exports[_0x59e016(0x1b7)] = void 0x0;
const fs_1 = __importDefault(require('fs')),
  path_1 = __importDefault(require(_0x59e016(0x1b8)));

function getFile(_0x24f81d) {
  const _0x5c9d4b = _0x59e016;
  return fs_1[_0x5c9d4b(0x1b9)][_0x5c9d4b(0x1ba)](_0x24f81d, _0x5c9d4b(0x1bb));
}

exports[_0x59e016(0x1b7)] = getFile;

function writeOutputToFile(_0x1e8ff3, _0xee60a9) {
  const _0x5a9ea1 = _0x59e016,
    _0x53a3a2 = path_1[_0x5a9ea1(0x1b9)][_0x5a9ea1(0x1bc)](_0x5a9ea1(0x1bd), _0x5a9ea1(0x1be));
  fs_1[_0x5a9ea1(0x1b9)][_0x5a9ea1(0x1bf)](_0x53a3a2, {
    'recursive': !![]
  });
  const _0x4c8543 = path_1[_0x5a9ea1(0x1b9)][_0x5a9ea1(0x1bc)](_0x53a3a2, _0x1e8ff3);
  fs_1[_0x5a9ea1(0x1b9)][_0x5a9ea1(0x1c0)](_0x4c8543, _0xee60a9, _0x5a9ea1(0x1bb));
}
exports[_0x59e016(0x1b6)] = writeOutputToFile;`;
    const ast = parser.parse(jsCode);
    autoRestoreStringLiteralViaIIFE(ast);
    memberExpComputedToFalse(ast);
    const { code: res } = generator(ast);
    console.log(res);
    expect(res).toContain(`var __importDefault = this && this.__importDefault || function (_0x50a342) {
  const _0x3f7f84 = _0x59e016;
  return _0x50a342 && _0x50a342.__esModule ? _0x50a342 : {
    'default': _0x50a342
  };
};
Object.defineProperty(exports, "__esModule", {
  'value': !![]
}), exports.writeOutputToFile = exports.getFile = void 0x0;
const fs_1 = __importDefault(require('fs')),
  path_1 = __importDefault(require("path"));
function getFile(_0x24f81d) {
  const _0x5c9d4b = _0x59e016;
  return fs_1.default.readFileSync(_0x24f81d, "utf-8");
}
exports.getFile = getFile;
function writeOutputToFile(_0x1e8ff3, _0xee60a9) {
  const _0x5a9ea1 = _0x59e016,
    _0x53a3a2 = path_1.default.resolve("src", "outputs");
  fs_1.default.mkdirSync(_0x53a3a2, {
    'recursive': !![]
  });
  const _0x4c8543 = path_1.default.resolve(_0x53a3a2, _0x1e8ff3);
  fs_1.default.writeFileSync(_0x4c8543, _0xee60a9, "utf-8");
}
exports.writeOutputToFile = writeOutputToFile;`);
  });
});
