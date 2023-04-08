"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memberExpComputedToFalse = void 0;
const traverse_1 = __importDefault(require("@babel/traverse"));
const types_1 = require("@babel/types");
// console['log']() 变 console.log()
// computed 属性如果为 false，是表示 . 来引用成员
// computed 属性为 true，则是 [] 来引用成员
function memberExpComputedToFalse(ast) {
    (0, traverse_1.default)(ast, {
        MemberExpression(path) {
            // path.get('property')获取到的是一个NodePath类型
            const propertyPath = path.get('property');
            if (!propertyPath.isStringLiteral())
                return;
            const val = propertyPath.node.value;
            path.node.computed = false;
            propertyPath.replaceWith((0, types_1.identifier)(val));
        }
    });
}
exports.memberExpComputedToFalse = memberExpComputedToFalse;
