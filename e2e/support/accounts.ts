import type { APIRequestContext } from "@playwright/test"

export const API_URL = "http://localhost:3334"
export const PASSWORD = "senha-de-teste-123"

// E-mail único por teste: os testes rodam em paralelo e o banco é o mesmo.
export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@teste.local`
}

// Cria a conta direto na API (mais rápido que pela tela) quando o teste não é
// sobre o cadastro.
export async function createAccount(request: APIRequestContext, name = "Pessoa de Teste") {
  const email = uniqueEmail()
  const response = await request.post(`${API_URL}/auth/register`, {
    data: { name, email, password: PASSWORD },
  })
  if (!response.ok()) throw new Error(`Cadastro falhou: ${response.status()} ${await response.text()}`)
  return { email, password: PASSWORD, name }
}
