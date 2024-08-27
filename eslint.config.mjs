import eslintConfig from '@dmitryrechkin/eslint-standard/eslint.config.mjs';

export default eslintConfig({
	tsconfigPath: './tsconfig.eslint.json',
	ignores: ['packages/**', 'tests/**'],
});