// Parte da checagem de débito técnico (ADR-035) que o knip não cobre. Roda no
// `npm run check:debt`, depois do knip.
//
// Falha quando a mudança deixa:
//   1. aviso de lint acima do teto de scripts/debt-baseline.json. Ficar abaixo
//      também falha, pedindo para baixar o teto no mesmo commit: o número só desce;
//   2. erro de lint;
//   3. marcador TODO/FIXME/HACK/XXX no código.

import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { ESLint } from "eslint"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const baseline = JSON.parse(readFileSync(path.join(root, "scripts/debt-baseline.json"), "utf8"))
const problems = []

// 1 e 2. Lint -------------------------------------------------------------------
const results = await new ESLint({ cwd: root }).lintFiles(["."])
const byRule = {}
let errors = 0
for (const r of results) {
  for (const m of r.messages) {
    if (m.severity === 2) errors++
    else byRule[m.ruleId ?? "(sem regra)"] = (byRule[m.ruleId ?? "(sem regra)"] ?? 0) + 1
  }
}
if (errors) problems.push(`lint com ${errors} erro(s): rode \`npm run lint\``)

const ceiling = baseline.lintWarnings ?? {}
const lowered = []
for (const rule of new Set([...Object.keys(byRule), ...Object.keys(ceiling)])) {
  const now = byRule[rule] ?? 0
  const max = ceiling[rule] ?? 0
  if (now > max) problems.push(`lint: ${rule} tem ${now} aviso(s), teto ${max}`)
  else if (now < max) lowered.push(`${rule}: ${max} → ${now}`)
}
if (lowered.length) {
  problems.push(`lint melhorou; baixe o teto em scripts/debt-baseline.json no mesmo commit (${lowered.join(", ")})`)
}

// 3. Marcadores de pendência -------------------------------------------------------
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((f) => /^(app|components|hooks|lib|e2e|scripts)\/.*\.(ts|tsx|mjs|js)$/.test(f))
for (const f of files) {
  let text
  try {
    text = readFileSync(path.join(root, f), "utf8")
  } catch {
    continue // apagado no working tree
  }
  text.split("\n").forEach((line, i) => {
    if (/\b(TODO|FIXME|HACK|XXX)\b/.test(line) && f !== "scripts/check-debt.mjs") {
      problems.push(`marcador de pendência: ${f}:${i + 1}`)
    }
  })
}

// ------------------------------------------------------------------------------------
if (problems.length) {
  console.error(`Débito técnico (${problems.length}):\n${problems.map((p) => `  - ${p}`).join("\n")}`)
  console.error("\nResolva no mesmo PR ou ajuste o teto com o motivo (ADR-035).")
  process.exit(1)
}
console.log("Lint dentro do teto e sem marcadores de pendência.")
