"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateLiteral = void 0;
const traverse_1 = __importDefault(require("@babel/traverse"));
const types_1 = require("@babel/types");
function translateLiteral(ast) {
    (0, traverse_1.default)(ast, {
        NumericLiteral(path) {
            const node = path.node;
            // 直接去除node.extra即可
            if (node.extra && /^0[obx]/i.test(node.extra.raw)) {
                node.extra = undefined;
            }
        },
        StringLiteral(path) {
            const node = path.node;
            if (node.extra && /\\[ux]/gi.test(node.extra.raw)) {
                let nodeValue = '';
                try {
                    nodeValue = decodeURIComponent(escape(node.value));
                }
                catch (error) {
                    nodeValue = node.value;
                }
                path.replaceWith((0, types_1.stringLiteral)(nodeValue));
                path.node.extra = {
                    'raw': JSON.stringify(nodeValue),
                    'rawValue': nodeValue
                };
            }
        }
    });
}
exports.translateLiteral = translateLiteral;
