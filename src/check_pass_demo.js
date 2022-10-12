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
const jsCode = (0, file_utils_1.getFile)('src/inputs/check_pass_demo.js');
const ast = parser.parse(jsCode);
(0, member_exp_computed_to_false_1.memberExpComputedToFalse)(ast);
(0, rename_vars_1.renameVars)(ast, (name) => name.substring(0, 3) === '_0x');
(0, translate_literal_1.translateLiteral)(ast);
const { code } = (0, generator_1.default)(ast);
(0, file_utils_1.writeOutputToFile)('check_pass_demo_out.js', code);
