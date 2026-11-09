import { test } from "node:test"
import assert from "node:assert/strict"
import { screenKey, screenLabel } from "../screens.ts"

test("nome da tela sem ids nem query", () => {
  assert.equal(screenKey("/"), "home")
  assert.equal(screenKey("/plan"), "plan")
  assert.equal(screenKey("/plan/abc123"), "plan-group")
  assert.equal(screenKey("/week/"), "week")
  assert.equal(screenKey("/cards/xyz?tab=1"), "cards")
  assert.equal(screenKey("/login"), null)
  assert.equal(screenKey("/admin"), null)
  assert.equal(screenLabel("inbox"), "A classificar")
  assert.equal(screenLabel("desconhecida"), "desconhecida")
})
