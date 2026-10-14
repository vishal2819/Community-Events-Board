import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "src/App.tsx",
    "src/main.tsx",
    "src/pages/**",
    "src/components/ui/**",
  ]),
  {
    rules: {
      // ignoreRestSiblings covers the omit-a-key idiom: the unused binding is the
      // one being dropped from an object rest.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
]);
