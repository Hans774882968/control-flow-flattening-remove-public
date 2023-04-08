"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameVars = exports.alphabetStyleName = exports.uglifyJSStyleName = exports.UGLIFYJS_TABLE_LENGTH = exports.ALPHABET_TABLE_LENGTH = exports.RenameAlgorithms = void 0;
const traverse_1 = __importDefault(require("@babel/traverse"));
var RenameAlgorithms;
(function (RenameAlgorithms) {
    RenameAlgorithms[RenameAlgorithms["NUMBER"] = 0] = "NUMBER";
    RenameAlgorithms[RenameAlgorithms["ALPHABET"] = 1] = "ALPHABET";
    RenameAlgorithms[RenameAlgorithms["UGLIFY_JS"] = 2] = "UGLIFY_JS";
})(RenameAlgorithms = exports.RenameAlgorithms || (exports.RenameAlgorithms = {}));
const alphabetTable = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$';
exports.ALPHABET_TABLE_LENGTH = 63;
const uglifyJSTable = 'etnrisouaflchpdvmgybwESxTNCkLAOM_DPHBjFIqRUzWXV$JKQGYZ0516372984';
exports.UGLIFYJS_TABLE_LENGTH = 64;
// 先加一个前缀规避关键字问题
function uglifyJSStyleName(i) {
    --i;
    if (i < 0) {
        throw new Error(`parameter i should be positive (got ${i + 1})`);
    }
    const a = [];
    do {
        a.push(uglifyJSTable[i % exports.UGLIFYJS_TABLE_LENGTH]);
        i = Math.floor(i / exports.UGLIFYJS_TABLE_LENGTH);
    } while (i);
    return `_${a.reverse().join('')}`;
}
exports.uglifyJSStyleName = uglifyJSStyleName;
// 先加一个前缀规避关键字问题
function alphabetStyleName(i) {
    --i;
    const originalVariableID = i;
    if (i < 0) {
        throw new Error(`parameter i should be positive (got ${i + 1})`);
    }
    const a = [];
    do {
        a.push(alphabetTable[i % exports.ALPHABET_TABLE_LENGTH]);
        i = Math.floor(i / exports.ALPHABET_TABLE_LENGTH);
    } while (i);
    return `${originalVariableID < 52 ? '' : '_'}${a.reverse().join('')}`;
}
exports.alphabetStyleName = alphabetStyleName;
// 对于全局变量与局部变量同名的情况，这段代码可能是有问题的
// 另外，重命名以后的变量名也可能与现有代码的变量名冲突。这些问题很棘手，需要学习 terser 等包的源码后才能解决
function renameVars(ast, canReplace = () => { return true; }, renameMap = {}, algorithm = RenameAlgorithms.NUMBER) {
    const names = new Set();
    (0, traverse_1.default)(ast, {
        Identifier(path) {
            const oldName = path.node.name;
            if (!canReplace(oldName))
                return;
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
    (0, traverse_1.default)(ast, {
        Identifier(path) {
            const oldName = path.node.name;
            if (!canReplace(oldName))
                return;
            path.node.name = renameMap[oldName];
        }
    });
}
exports.renameVars = renameVars;
