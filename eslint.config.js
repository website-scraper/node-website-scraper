import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

export default [
	js.configs.recommended,
	{
		files: ['lib/**/*.js', 'index.mjs'],
		plugins: {
			'@stylistic': stylistic
		},
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
			globals: {
				...globals.node,
				...globals.mocha
			}
		},
		rules: {
			'consistent-return': 'error',
			'curly': 'error',
			'default-case': 'error',
			'dot-notation': 'error',
			'eqeqeq': 'error',
			'no-extend-native': 'error',
			'no-implicit-coercion': 'error',
			'no-loop-func': 'error',
			'no-throw-literal': 'error',
			'camelcase': 'error',
			'consistent-this': ['error', 'self'],
			'func-names': 'warn',
			'no-console': 'error',

			'@stylistic/no-multi-spaces': 'error',
			'@stylistic/brace-style': ['error', '1tbs', {allowSingleLine: true}],
			'@stylistic/indent': ['error', 'tab', {SwitchCase: 1}],
			'@stylistic/linebreak-style': ['error', 'unix'],
			'@stylistic/eol-last': 'error',
			'@stylistic/quotes': ['error', 'single'],
			'@stylistic/semi': 'error',
			'@stylistic/space-infix-ops': 'error',
			'@stylistic/space-unary-ops': 'error',
			'@stylistic/space-before-function-paren': 'warn',
			'@stylistic/function-call-spacing': ['warn', 'never'],
			'@stylistic/keyword-spacing': 'error',
			'@stylistic/space-before-blocks': 'error'
		}
	}
];
