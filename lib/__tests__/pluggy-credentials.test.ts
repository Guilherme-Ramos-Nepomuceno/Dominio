import { test } from "node:test"
import assert from "node:assert/strict"
import { checkPluggyCredentials, normalizePluggyCredential } from "../pluggy-credentials.ts"

const CLIENT_ID = "1a2b3c4d-1a2b-4c3d-8e9f-1a2b3c4d5e6f"
const SECRET = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-aBcDeF"

test("credenciais no formato certo: pronto para conectar", () => {
  assert.deepEqual(checkPluggyCredentials(CLIENT_ID, SECRET), { clientIdError: null, clientSecretError: null, ready: true })
})

test("campos vazios não mostram erro, mas não deixam conectar", () => {
  assert.deepEqual(checkPluggyCredentials("", ""), { clientIdError: null, clientSecretError: null, ready: false })
  assert.equal(checkPluggyCredentials(CLIENT_ID, "").ready, false)
})

test("espaços, quebras de linha e aspas nas pontas são ignorados", () => {
  assert.equal(normalizePluggyCredential(`  "${CLIENT_ID}"\n`), CLIENT_ID)
  assert.equal(checkPluggyCredentials(` ${CLIENT_ID} `, `'${SECRET}'`).ready, true)
})

test("clientId fora do formato UUID", () => {
  const check = checkPluggyCredentials("meu-client-id", SECRET)
  assert.match(check.clientIdError ?? "", /formato/)
  assert.equal(check.ready, false)
})

test("campos colados trocados", () => {
  const check = checkPluggyCredentials(SECRET, CLIENT_ID)
  assert.match(check.clientIdError ?? "", /trocados/)
  assert.equal(check.ready, false)
})

test("espaço no meio de qualquer campo", () => {
  assert.match(checkPluggyCredentials("1a2b3c4d 1a2b", SECRET).clientIdError ?? "", /espaço/)
  assert.match(checkPluggyCredentials(CLIENT_ID, "AbCd EfGh IjKl MnOp QrSt").clientSecretError ?? "", /espaço/)
})

test("secret igual ao clientId ou curto demais", () => {
  assert.match(checkPluggyCredentials(CLIENT_ID, CLIENT_ID).clientSecretError ?? "", /mesmo valor/)
  assert.match(checkPluggyCredentials(CLIENT_ID, "abc123").clientSecretError ?? "", /incompleto/)
})

test("secret em formato UUID (contas antigas) continua aceito", () => {
  assert.equal(checkPluggyCredentials(CLIENT_ID, "9f8e7d6c-1a2b-4c3d-8e9f-1a2b3c4d5e6f").ready, true)
})
