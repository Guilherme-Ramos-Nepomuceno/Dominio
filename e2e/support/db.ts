import { execFileSync } from "node:child_process"

// SQL direto no banco de teste (container do docker-compose.test.yml da API),
// para montar cenários que dependem de serviços externos — ex.: a fila da
// Pluggy, que no app só é preenchida por uma sincronização de verdade.
export function sql(query: string): string {
  return execFileSync(
    "docker",
    ["exec", "-i", "dominio-test-db", "psql", "-U", "dominio_test", "-d", "dominio_test", "-v", "ON_ERROR_STOP=1", "-tA"],
    { input: query, encoding: "utf8" },
  ).trim()
}

// Texto seguro para entrar entre aspas simples no SQL.
export const q = (value: string) => `'${value.replace(/'/g, "''")}'`
