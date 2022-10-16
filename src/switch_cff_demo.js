"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const parser = __importStar(require("@babel/parser"));
const rename_vars_1 = require("./rename_vars");
const generator_1 = __importDefault(require("@babel/generator"));
const file_utils_1 = require("./file_utils");
const member_exp_computed_to_false_1 = require("./member_exp_computed_to_false");
const translate_literal_1 = require("./translate_literal");
const traverse_1 = __importDefault(require("@babel/traverse"));
const types_1 = require("@babel/types");
const jsCode = (0, file_utils_1.getFile)('src/inputs/switch_cff_demo.js');
const ast = parser.parse(jsCode);
// 如果常量表不止1处，则此代码不正确
function restoreStringLiteral(ast, stringLiteralFuncs, getStringArr) {
    // 收集与常量串隐藏有关的变量
    (0, traverse_1.default)(ast, {
        VariableDeclarator(path) {
            const vaNode = path.node;
            if (!(0, types_1.isIdentifier)(vaNode.init) || !(0, types_1.isIdentifier)(vaNode.id))
                return;
            if (stringLiteralFuncs.includes(vaNode.init.name)) {
                stringLiteralFuncs.push(vaNode.id.name);
            }
        }
    });
    (0, traverse_1.default)(ast, {
        CallExpression(path) {
            const cNode = path.node;
            if (!(0, types_1.isIdentifier)(cNode.callee))
                return;
            const varName = cNode.callee.name;
            if (!stringLiteralFuncs.includes(varName))
                return;
            if (cNode.arguments.length !== 1 || !(0, types_1.isNumericLiteral)(cNode.arguments[0]))
                return;
            const idx = cNode.arguments[0].value;
            path.replaceWith((0, types_1.stringLiteral)(getStringArr(idx)));
        }
    });
}
restoreStringLiteral(ast, ['_0x27c4'], (idx) => {
    return ['661835nuUXrL', 'dKifE', 'try again', 'log', '7aEbwep', 'awvtQ', '2804302XtaWgC', 'rmnID', 'flag{hans}', '21393471OyFTzd', 'lXUhG', '1914456NQDFwp', '1xRwaZJ', '36ZbcbZP', '3gJgrjU', '8162226GwaJpl', '3|4|2|0|5|1', 'split', 'charCodeAt', 'pass', '6278120IHpVNF', 'W_PTJ[P]BN', 'length', 'fromCharCode', '939280gOLaZV'][idx - 0x89];
});
function cff(ast) {
    const cffTables = {};
    (0, traverse_1.default)(ast, {
        VariableDeclarator(path) {
            const node = path.node;
            if (!node.id || !(0, types_1.isIdentifier)(node.id))
                return;
            const tableName = node.id.name;
            if (!(0, types_1.isObjectExpression)(node.init))
                return;
            const tableProperties = node.init.properties;
            cffTables[tableName] = tableProperties.reduce((cffTable, tableProperty) => {
                if (!(0, types_1.isObjectProperty)(tableProperty) ||
                    !(0, types_1.isStringLiteral)(tableProperty.key))
                    return cffTable;
                cffTable[tableProperty.key.value] = tableProperty.value;
                return cffTable;
            }, {});
        }
    });
    (0, traverse_1.default)(ast, {
        CallExpression(path) {
            const cNode = path.node;
            if ((0, types_1.isMemberExpression)(cNode.callee)) {
                if (!(0, types_1.isIdentifier)(cNode.callee.object))
                    return;
                const callParams = cNode.arguments;
                const tableName = cNode.callee.object.name;
                if (!(0, types_1.isStringLiteral)(cNode.callee.property))
                    return;
                const keyName = cNode.callee.property.value;
                if (!(tableName in cffTables) ||
                    !(keyName in cffTables[tableName]))
                    return;
                const shouldBeFuncValue = cffTables[tableName][keyName];
                if (!(0, types_1.isFunctionExpression)(shouldBeFuncValue) ||
                    !shouldBeFuncValue.body.body.length ||
                    !(0, types_1.isReturnStatement)(shouldBeFuncValue.body.body[0]))
                    return;
                // 拿到返回值
                const callArgument = shouldBeFuncValue.body.body[0].argument;
                if ((0, types_1.isBinaryExpression)(callArgument) && callParams.length === 2) {
                    if (!(0, types_1.isExpression)(callParams[0]) || !(0, types_1.isExpression)(callParams[1])) {
                        throw '二元运算符中，两个参数都应为表达式';
                    }
                    // 处理function(x, y){return x + y}这种形式
                    path.replaceWith((0, types_1.binaryExpression)(callArgument.operator, callParams[0], callParams[1]));
                }
                else if ((0, types_1.isLogicalExpression)(callArgument) && callParams.length === 2) {
                    if (!(0, types_1.isExpression)(callParams[0]) || !(0, types_1.isExpression)(callParams[1])) {
                        throw '逻辑运算符中，两个参数都应为表达式';
                    }
                    // 处理function(x, y){return x > y}这种形式
                    path.replaceWith((0, types_1.logicalExpression)(callArgument.operator, callParams[0], callParams[1]));
                }
                else if ((0, types_1.isCallExpression)(callArgument) && (0, types_1.isIdentifier)(callArgument.callee)) {
                    // 处理function(f, ...args){return f(...args)}这种形式
                    if (callParams.length == 1) {
                        path.replaceWith(callParams[0]);
                    }
                    else {
                        if (!(0, types_1.isExpression)(callParams[0])) {
                            throw '仅支持第一个参数为函数的形式，如：function(f, ...args){return f(...args)}';
                        }
                        path.replaceWith((0, types_1.callExpression)(callParams[0], callParams.slice(1)));
                    }
                }
            }
        },
        MemberExpression(path) {
            const mNode = path.node;
            if (!(0, types_1.isIdentifier)(mNode.object))
                return;
            const tableName = mNode.object.name;
            if (!(0, types_1.isStringLiteral)(mNode.property))
                return;
            const keyName = mNode.property.value;
            if (!(tableName in cffTables) ||
                !(keyName in cffTables[tableName]))
                return;
            const cffTableValue = cffTables[tableName][keyName];
            path.replaceWith(cffTableValue);
        }
    });
}
cff(ast);
function switchCFF(ast) {
    (0, traverse_1.default)(ast, {
        WhileStatement(path) {
            const wNode = path.node;
            if (!(0, types_1.isBlockStatement)(wNode.body) || !wNode.body.body.length)
                return;
            const switchNode = wNode.body.body[0];
            if (!(0, types_1.isSwitchStatement)(switchNode))
                return;
            const { discriminant, cases } = switchNode;
            if (!(0, types_1.isMemberExpression)(discriminant) ||
                !(0, types_1.isIdentifier)(discriminant.object))
                return;
            // switch语句内的控制流平坦化数组名，本例中是 _0x31ce85
            const arrayName = discriminant.object.name;
            // 获取控制流平坦化数组绑定的节点
            const bindingArray = path.scope.getBinding(arrayName);
            if (!bindingArray)
                return;
            // 经过restoreStringLiteral，我们认为它已经恢复为'v1|v2...'['split']('|')
            if (!(0, types_1.isVariableDeclarator)(bindingArray.path.node) ||
                !(0, types_1.isCallExpression)(bindingArray.path.node.init))
                return;
            const varInit = bindingArray.path.node.init;
            if (!(0, types_1.isMemberExpression)(varInit.callee) ||
                !(0, types_1.isStringLiteral)(varInit.callee.object) ||
                varInit.arguments.length !== 1 ||
                !(0, types_1.isStringLiteral)(varInit.arguments[0]))
                return;
            const object = varInit.callee.object.value;
            const propty = varInit.callee.property;
            if (!(0, types_1.isStringLiteral)(propty) && !(0, types_1.isIdentifier)(propty))
                return;
            const propertyName = (0, types_1.isStringLiteral)(propty) ? propty.value : propty.name;
            const splitArg = varInit.arguments[0].value;
            // 目前只支持'v1|v2...'.split('|')的解析
            if (propertyName !== 'split') {
                console.warn('switchCFF(ast)：目前只支持\'v1|v2...\'.split(\'|\')的解析');
                return;
            }
            const indexArr = object[propertyName](splitArg);
            const replaceBody = indexArr.reduce((replaceBody, index) => {
                const caseBody = cases[+index].consequent;
                if ((0, types_1.isContinueStatement)(caseBody[caseBody.length - 1])) {
                    caseBody.pop();
                }
                return replaceBody.concat(caseBody);
            }, []);
            path.replaceInline(replaceBody);
            // 可选择的操作：删除控制流平坦化数组绑定的节点、自增变量名绑定的节点
            if (!(0, types_1.isUpdateExpression)(discriminant.property) ||
                !(0, types_1.isIdentifier)(discriminant.property.argument))
                return;
            const autoIncrementName = discriminant.property.argument.name;
            const bindingAutoIncrement = path.scope.getBinding(autoIncrementName);
            if (!bindingAutoIncrement)
                return;
            bindingArray.path.remove();
            bindingAutoIncrement.path.remove();
        }
    });
}
switchCFF(ast);
function removeStringTransCodes(ast) {
    (0, traverse_1.default)(ast, {
        // 去除给string数组进行随机移位的自执行函数
        CallExpression(path) {
            if (!(0, types_1.isFunctionExpression)(path.node.callee))
                return;
            if (path.node.arguments.length !== 2 ||
                !(0, types_1.isNumericLiteral)(path.node.arguments[1]) ||
                path.node.arguments[1].value !== 0xdbab3)
                return;
            path.remove();
        },
        // 去除给string数组进行随机移位的函数
        FunctionDeclaration(path) {
            if (!(0, types_1.isIdentifier)(path.node.id))
                return;
            const funcName = path.node.id.name;
            if (!['_0x27c4', '_0x379e'].includes(funcName))
                return;
            path.remove();
        },
        // 去除控制流平坦化的哈希表和用于隐藏常量串的变量
        VariableDeclarator(path) {
            if (!(0, types_1.isIdentifier)(path.node.id))
                return;
            const varName = path.node.id.name;
            // 控制流平坦化的哈希表和用于隐藏常量串的变量
            if (!['_0x550d17', '_0x55bea2', '_0x47f9f1'].includes(varName))
                return;
            path.remove();
        }
    });
}
removeStringTransCodes(ast);
(0, member_exp_computed_to_false_1.memberExpComputedToFalse)(ast);
(0, rename_vars_1.renameVars)(ast, (name) => name.substring(0, 3) === '_0x', {
    enc: 'enc', _0x263396: 'i', _0x13adf6: 'out'
});
(0, translate_literal_1.translateLiteral)(ast);
const { code } = (0, generator_1.default)(ast);
(0, file_utils_1.writeOutputToFile)('switch_cff_demo_out.js', code);
