import {
  ALPHABET_TABLE_LENGTH,
  alphabetStyleName,
  UGLIFYJS_TABLE_LENGTH,
  uglifyJSStyleName
} from '../../src/rename_vars';

describe('rename algorithms', () => {
  it('alphabetStyleName', () => {
    expect(alphabetStyleName(0 + 1)).toBe('a');
    expect(alphabetStyleName(1 + 1)).toBe('b');
    expect(alphabetStyleName( + 52)).toBe('Z');
    expect(alphabetStyleName( + 53)).toBe('_0');
    expect(alphabetStyleName(ALPHABET_TABLE_LENGTH)).toBe('_$');
    expect(alphabetStyleName(ALPHABET_TABLE_LENGTH + 1)).toBe('_ba');
    expect(alphabetStyleName(ALPHABET_TABLE_LENGTH + 2)).toBe('_bb');
    expect(alphabetStyleName(ALPHABET_TABLE_LENGTH * ALPHABET_TABLE_LENGTH + 1)).toBe('_baa');
    expect(alphabetStyleName(ALPHABET_TABLE_LENGTH * ALPHABET_TABLE_LENGTH + 26 * ALPHABET_TABLE_LENGTH + 1)).toBe('_bAa');
  });

  it('uglifyJSStyleName', () => {
    expect(uglifyJSStyleName(0 + 1)).toBe('_e');
    expect(uglifyJSStyleName(1 + 1)).toBe('_t');
    expect(uglifyJSStyleName(UGLIFYJS_TABLE_LENGTH)).toBe('_4');
    expect(uglifyJSStyleName(UGLIFYJS_TABLE_LENGTH + 1)).toBe('_te');
    expect(uglifyJSStyleName(UGLIFYJS_TABLE_LENGTH + 2)).toBe('_tt');
    expect(uglifyJSStyleName(UGLIFYJS_TABLE_LENGTH * UGLIFYJS_TABLE_LENGTH + 1)).toBe('_tee');
    expect(uglifyJSStyleName(UGLIFYJS_TABLE_LENGTH * UGLIFYJS_TABLE_LENGTH + 21 * UGLIFYJS_TABLE_LENGTH + 1)).toBe('_tEe'); // uglifyJSTable[21] = 'E'
  });
});
