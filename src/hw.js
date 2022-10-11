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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const parser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const types_1 = require("@babel/types");
const generator_1 = __importDefault(require("@babel/generator"));
function getFile(path) {
    return fs_1.default.readFileSync(path, 'utf-8');
}
function writeOutputToFile(outFileName, code) {
    const outputDir = path_1.default.resolve('src', 'outputs');
    fs_1.default.mkdirSync(outputDir, { recursive: true });
    const outputPath = path_1.default.resolve(outputDir, outFileName);
    fs_1.default.writeFileSync(outputPath, code, 'utf-8');
}
const jsCode = getFile('src/inputs/hw.js');
const ast = parser.parse(jsCode);
const decodeWhileOpts = {
    WhileStatement(path) {
        const { body } = path.node;
        const swithchNode = body.body[0];
        if (!(0, types_1.isSwitchStatement)(swithchNode))
            return;
        const { discriminant, cases } = swithchNode;
        // 这里的类型守卫有更优雅的写法么qwq？
        if (!(0, types_1.isMemberExpression)(discriminant) ||
            !(0, types_1.isUpdateExpression)(discriminant.property) ||
            !(0, types_1.isIdentifier)(discriminant.object))
            return;
        const arrName = discriminant.object.name;
        // 面向源码编程：希望拿到两个变量声明的节点
        const perBroNode = path.getAllPrevSiblings();
        let arrVal = [];
        perBroNode.forEach(perNode => {
            const nd = perNode.node;
            if (!(0, types_1.isVariableDeclaration)(nd))
                return;
            const { declarations } = nd;
            const { id, init } = declarations[0];
            // 这里的类型守卫有更优雅的写法么qwq？
            if (!(0, types_1.isCallExpression)(init) ||
                !(0, types_1.isMemberExpression)(init.callee) ||
                !(0, types_1.isStringLiteral)(init.callee.object) ||
                !(0, types_1.isIdentifier)(id))
                return;
            if (arrName === id.name) {
                arrVal = init.callee.object.value.split(',');
            }
        });
        const replaceBody = arrVal.reduce((replaceBody, index) => {
            const caseBody = cases[+index].consequent;
            if ((0, types_1.isContinueStatement)(caseBody[caseBody.length - 1])) {
                caseBody.pop();
            }
            return replaceBody.concat(caseBody);
        }, []);
        path.replaceInline(replaceBody);
    }
};
(0, traverse_1.default)(ast, decodeWhileOpts);
const { code } = (0, generator_1.default)(ast);
writeOutputToFile('hw_out.js', code);
