import * as parser from '@babel/parser';
import { renameVars } from './rename_vars';
import generator from '@babel/generator';
import { getFile, writeOutputToFile } from './file_utils';
import { memberExpComputedToFalse } from './member_exp_computed_to_false';
import { translateLiteral } from './translate_literal';

const jsCode = getFile('src/inputs/check_pass_demo.js');
const ast = parser.parse(jsCode);
memberExpComputedToFalse(ast);
renameVars(ast, (name:string) => name.substring(0, 3) === '_0x');
translateLiteral(ast);
const { code } = generator(ast);
writeOutputToFile('check_pass_demo_out.js', code);
