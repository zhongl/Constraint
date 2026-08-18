import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist/**", "**/dist/**", ".agents/**", "node_modules/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.js", "vite.config.mjs", "tests/**/*.mjs"],
    languageOptions: {
      globals: {
        ...Object.fromEntries(
          [
            "window",
            "document",
            "console",
            "alert",
            "WebGL2RenderingContext",
            "URL",
            "process",
          ].map((name) => [name, "readonly"]),
        ),
      },
    },
  },
];
