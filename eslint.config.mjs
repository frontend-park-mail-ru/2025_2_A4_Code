import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Ignore non-source folders/files
  { ignores: [
      "node_modules/**",
      "temp/**",
      "**/*.min.js",
      "**/vendor/**",
    ]
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        Handlebars: "readonly",
      },
    },
    rules: {
      // Customize rules here if needed
    },
  },
]);
