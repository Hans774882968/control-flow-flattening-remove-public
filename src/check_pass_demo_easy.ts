import * as parser from '@babel/parser';
import { renameVars } from './rename_vars';
import generator from '@babel/generator';
import { getFile, writeOutputToFile } from './file_utils';
import { memberExpComputedToFalse } from './member_exp_computed_to_false';
import { translateLiteral } from './translate_literal';
import { cff } from './remove_cff';

const jsCode = getFile('src/inputs/check_pass_demo_easy.js');
const ast = parser.parse(jsCode);

cff(ast);
memberExpComputedToFalse(ast);
renameVars(
  ast,
  (name:string) => name.substring(0, 3) === '_0x',
  {
    check_pass: 'check_pass', test: 'test', _0x537fc8: 'i',
    _0x3df4b0: 'sum', _0x57a7be: 'password'
  }
);
translateLiteral(ast);

const { code } = generator(ast);
writeOutputToFile('check_pass_demo_easy_out.js', code);
