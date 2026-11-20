import tseslint from "typescript-eslint";

/**
 * typescript-eslint strict and stylistic presets with typed linting.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const strict = [
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  { languageOptions: { parserOptions: { projectService: true } } },
  { files: ["**/*.{js,mjs,cjs}"], ...tseslint.configs.disableTypeChecked },
];
