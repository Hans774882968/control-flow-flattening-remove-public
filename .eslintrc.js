module.exports = {
  'env': {
    'browser': true,
    'es2021': true
  },
  'extends': [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  'overrides': [
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaVersion': 'latest',
    'sourceType': 'module'
  },
  'plugins': [
    '@typescript-eslint'
  ],
  rules: {
    // http://eslint.cn/docs/rules/
    'no-console': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    // 使用2个空格
    'indent': ['error', 2, { SwitchCase: 1 }],
    'semi': 'error',
    // 使用单引号
    'quotes': ['error', 'single'],
    'eol-last': 'error',
    'no-trailing-spaces': 'error', // 禁用行尾空格,
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/naming-convention': [
      'off',
      {
        selector: 'default',
        format: null
      }
    ],
    'space-infix-ops': ['error', { 'int32Hint': false }],
    'space-before-function-paren': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'arrow-spacing': ['error', { 'before': true, 'after': true }],
    'comma-spacing': 'error',
    'key-spacing': 'error',
    'space-before-blocks': 'error',
    'keyword-spacing': ['error', { 'before': true }], // } else if() {
    'object-curly-spacing': [
      2,
      'always',
      { arraysInObjects: true, objectsInObjects: false }
    ],
    'no-constant-condition': ['error', { 'checkLoops': false }]
  }
};
