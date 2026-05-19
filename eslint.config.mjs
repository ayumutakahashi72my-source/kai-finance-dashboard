import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Legitimate patterns: resetting state on prop change, mount-time browser API checks, etc.
      'react-hooks/set-state-in-effect': 'warn',
      // Lucide icon components from getCategoryIcon() are stable references, not dynamic components.
      'react-hooks/static-components': 'warn',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design prototype files — not used in production app
    "components/kai/dashboard/**",
    "components/kai/screens/**",
    "components/kai/budget/**",
    "components/kai/settings/**",
    "components/kai/add/**",
    "mock/**",
  ]),
]);

export default eslintConfig;
