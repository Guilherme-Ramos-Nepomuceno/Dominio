// Pilha local completa para testes: banco de teste (Postgres em container,
// porta 5434) + API de teste (porta 3334) + front em build de produção
// (porta 3100). A API vem de ../dominio-api ou de DOMINIO_API_DIR.
//
//   node scripts/local-stack.mjs up     sobe tudo e fica rodando (Ctrl+C para)
//   node scripts/local-stack.mjs test   roda todos os testes dos dois repos
import { spawn, spawnSync } from "node:child_process"
import path from "node:path"

const WEB_DIR = process.cwd()
const API_DIR = process.env.DOMINIO_API_DIR ?? path.resolve(WEB_DIR, "../dominio-api")
const API_URL = "http://localhost:3334"

function run(label, command, cwd, env) {
  console.log(`\n▶ ${label}`)
  const result = spawnSync(command, { cwd, shell: true, stdio: "inherit", env: env ? { ...process.env, ...env } : process.env })
  return result.status === 0
}

function up() {
  const db =
    run("Banco de teste do zero", "npm run test:db:down && npm run test:db:up", API_DIR) &&
    run("Migrations", "npm run test:db:migrate", API_DIR) &&
    run("Build do front", "npm run build", WEB_DIR, { NEXT_PUBLIC_API_URL: API_URL })
  if (!db) process.exit(1)

  const children = [
    spawn("npm run start:test", { cwd: API_DIR, shell: true, stdio: "inherit" }),
    spawn("npx next start -p 3100", {
      cwd: WEB_DIR,
      shell: true,
      stdio: "inherit",
      env: { ...process.env, NEXT_PUBLIC_API_URL: API_URL },
    }),
  ]
  console.log(`\nPilha no ar: front http://localhost:3100 · API ${API_URL} · banco localhost:5434 (Ctrl+C para parar)\n`)

  const stop = () => {
    for (const child of children) {
      if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" })
      else child.kill("SIGTERM")
    }
    process.exit(0)
  }
  process.on("SIGINT", stop)
  process.on("SIGTERM", stop)
}

function testAll() {
  const steps = [
    ["Front · tipos", "npx tsc --noEmit -p .", WEB_DIR],
    ["Front · regras (lib/)", "npm test", WEB_DIR],
    ["API · tipos", "npx tsc --noEmit -p .", API_DIR],
    ["API · unidade", "npm test", API_DIR],
    ["E2E · front + API + banco", "npx playwright test", WEB_DIR],
  ]
  const results = steps.map(([label, command, cwd]) => [label, run(label, command, cwd)])
  console.log("\nResumo")
  for (const [label, ok] of results) console.log(`  ${ok ? "✔" : "✖"} ${label}`)
  process.exit(results.every(([, ok]) => ok) ? 0 : 1)
}

const mode = process.argv[2]
if (mode === "up") up()
else if (mode === "test") testAll()
else {
  console.error("Uso: node scripts/local-stack.mjs <up|test>")
  process.exit(1)
}
