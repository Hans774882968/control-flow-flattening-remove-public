"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
function getFile(path) {
    return fs_1.default.readFileSync(path, 'utf-8');
}
const jsCode = getFile('src/inputs/hw.js');
console.log(jsCode.substring(0, 60));
