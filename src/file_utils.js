"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeOutputToFile = exports.getFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function getFile(path) {
    return fs_1.default.readFileSync(path, 'utf-8');
}
exports.getFile = getFile;
function writeOutputToFile(outFileName, code) {
    const outputDir = path_1.default.resolve('src', 'outputs');
    fs_1.default.mkdirSync(outputDir, { recursive: true });
    const outputPath = path_1.default.resolve(outputDir, outFileName);
    fs_1.default.writeFileSync(outputPath, code, 'utf-8');
}
exports.writeOutputToFile = writeOutputToFile;
