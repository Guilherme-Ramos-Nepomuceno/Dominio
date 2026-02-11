# Módulo de Login (Auth Simulator)

Simulação de autenticação e registro de usuário utilizando persistência local.

## Contexto

Prover uma experiência de onboarding e proteção de acesso (simbólica) para o usuário, coletando nome e dados iniciais para personalização da interface.

## Especificações Técnicas

### Controlador

- `LoginPage`: Gerencia alternância entre Login/Cadastro e feedback de erro/loading.

### Bibliotecas

- `framer-motion`: Utilizado extensivamente para animações de entrada (Logo, Tab Switcher, Troca de Formulário, Mensagens de Erro).

### Segurança (Nota)

Como este é um app "Local-First" (client-side storage), a autenticação não gera tokens JWT reais nem comunica com backend. Ela apenas valida se as credenciais batem com o objeto `user` salvo no `localStorage`.

## Regras de Negócio

1. **Login**: Verifica match exato de email e senha salvos.
2. **Cadastro**: Salva novo usuário no storage (`user_data`). Valida campos obrigatórios.
3. **UX**: Delay artificial de 1s (`setTimeout`) para simular requisição de rede e dar peso à ação.

## API / Events

| Função | Origem | Ação |
| :--- | :--- | :--- |
| `loginUser(email, pass)` | `lib/auth` | Retorna `{ success: bool }` |
| `registerUser(...)` | `lib/auth` | Sobrescreve usuário atual no Storage |

## Diretrizes de Uso

### Animação de Tab

O switch Login/Cadastro usa `layoutId` ou lógica de posição absoluta no Framer Motion para animar o background pílula mudando de lado.

```typescript
animate={{ x: isLogin ? 0 : "100%" }}
```
