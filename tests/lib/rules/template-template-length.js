const rule = require('../../../lib/rules/template-template-length');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

// GJS: sourceCode.getText(node) returns the full <template>...</template> string.
// '<template>hi</template>' is 23 chars.
// '<template>\n  one\n  two\n</template>' is 34 chars.

ruleTester.run('template-template-length', rule, {
  valid: [
    // 34 chars, max 50 is fine
    {
      code: `<template>
  one
  two
</template>`,
      options: [{ max: 50 }],
    },
    // 42 chars, min 10 is fine
    {
      code: `<template>
  one
  two
  three
</template>`,
      options: [{ min: 10 }],
    },
    // disabled via false
    {
      code: `<template>
  one
</template>`,
      options: [false],
    },
    // no options = no checks
    `<template>testing this
and
this</template>`,
  ],
  invalid: [
    {
      // '<template>\n  one\n  two\n</template>' = 34 chars
      code: `<template>
  one
  two
</template>`,
      output: null,
      options: [{ min: 50 }],
      errors: [{ message: 'Template length of 34 is smaller than 50' }],
    },
    {
      // '<template>\n  one\n  two\n  three\n</template>' = 42 chars
      code: `<template>
  one
  two
  three
</template>`,
      output: null,
      options: [{ max: 30 }],
      errors: [{ message: 'Template length of 42 exceeds 30' }],
    },
  ],
});

const hbsRuleTester = new RuleTester({
  parser: require.resolve('ember-eslint-parser/hbs'),
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

hbsRuleTester.run('template-template-length', rule, {
  valid: [
    // no options = no checks (defaults not applied without `true`)
    'testing this\nand\nthis',
    'short',
    // 13 chars, max 200 is fine
    {
      code: 'testing\nthis\n',
      options: [{ max: 200 }],
    },
    // 13 chars, min 1 is fine
    {
      code: 'testing\nthis\n',
      options: [{ min: 1 }],
    },
    // 20 chars, min 5 and max 50 is fine
    {
      code: 'testing\nthis\nandthis\n',
      options: [{ min: 5, max: 50 }],
    },
  ],
  invalid: [
    {
      // 'short' = 5 chars
      code: 'short',
      output: null,
      options: [{ min: 10 }],
      errors: [{ message: 'Template length of 5 is smaller than 10' }],
    },
    {
      // 'testing\nthis\nand\nthis\n' = 22 chars
      code: 'testing\nthis\nand\nthis\n',
      output: null,
      options: [{ max: 10 }],
      errors: [{ message: 'Template length of 22 exceeds 10' }],
    },
  ],
});
