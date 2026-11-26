import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

// ESLint 9 (configuração flat), com as regras do Next 16. O `next lint` não
// existe mais, então o `npm run lint` chama o eslint direto.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Os dados crus da API chegam como `any` e são normalizados nas funções
      // map* (lib/), que devolvem tipos certos para o resto do app (ADR-022).
      "@typescript-eslint/no-explicit-any": "off",
      // Tirar um campo com rest (`const { a, ...resto } = x`) é o jeito de
      // montar o objeto sem ele; o campo descartado não conta como "sem uso".
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
      // Regra nova do React 19: os hooks MVVM carregam dados em efeito e
      // atualizam o estado lá. Fica como aviso (dívida visível) até migrar
      // esses carregamentos; código novo deve evitar o padrão.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "public/sw.js",
  ]),
])
