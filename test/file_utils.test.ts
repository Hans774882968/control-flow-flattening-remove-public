import { getLegalFileName } from '../src/file_utils';

it('getLegalFileName', () => {
  expect(getLegalFileName('123456.txt', '123.txt')).toBe('123456.txt');

  expect(getLegalFileName('123:456.txt', '123.txt')).toBe('123456.txt');
  expect(getLegalFileName('123?456.txt', '123.txt')).toBe('123456.txt');
  expect(getLegalFileName('123\\456.txt', '123.txt')).toBe('123456.txt');
  expect(getLegalFileName('src/4/56.txt', '123.txt')).toBe('src456.txt');
  expect(getLegalFileName('*4"?/5?|6*.txt', '123.txt')).toBe('456.txt');

  expect(getLegalFileName('*"?/?|*.txt', '123.txt')).toBe('.txt');
});
