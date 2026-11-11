// Validação na hora dos campos de credencial da Pluggy (clientId e
// clientSecret), antes de mandar pro backend — que ainda confere de verdade
// contra a Pluggy. Pura, testável com node:test.
//
// Formatos observados numa conta real (2026-11): clientId é um UUID
// (8-4-4-4-12); clientSecret é um texto longo sem espaços (~43 caracteres).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MIN_SECRET_LENGTH = 20

// Copiar do dashboard às vezes traz espaço/quebra de linha nas pontas ou aspas.
export function normalizePluggyCredential(value: string): string {
  return value.trim().replace(/^["'`]+|["'`]+$/g, "").trim()
}

export interface PluggyCredentialsCheck {
  clientIdError: string | null
  clientSecretError: string | null
  ready: boolean
}

export function checkPluggyCredentials(rawClientId: string, rawClientSecret: string): PluggyCredentialsCheck {
  const clientId = normalizePluggyCredential(rawClientId)
  const clientSecret = normalizePluggyCredential(rawClientSecret)

  let clientIdError: string | null = null
  let clientSecretError: string | null = null

  // Campo vazio não é erro (a pessoa ainda não colou) — só não deixa conectar.
  if (clientId) {
    if (/\s/.test(clientId)) clientIdError = "Tem espaço no meio — copie o clientId de novo."
    else if (!UUID.test(clientId)) {
      clientIdError = UUID.test(clientSecret)
        ? "Parece que os campos estão trocados: o clientId é o que tem o formato 1a2b3c4d-…"
        : "O clientId tem o formato 1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d5e6f."
    }
  }

  if (clientSecret) {
    if (/\s/.test(clientSecret)) clientSecretError = "Tem espaço no meio — copie o clientSecret de novo."
    else if (clientSecret === clientId) clientSecretError = "É o mesmo valor do clientId — copie o clientSecret."
    else if (clientSecret.length < MIN_SECRET_LENGTH) clientSecretError = "Parece incompleto — copie o clientSecret inteiro."
  }

  return {
    clientIdError,
    clientSecretError,
    ready: !!clientId && !!clientSecret && !clientIdError && !clientSecretError,
  }
}
