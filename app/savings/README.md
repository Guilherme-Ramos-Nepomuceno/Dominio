# Módulo de Reservas (Savings)

Dinheiro guardado, separado em "caixinhas" (reservas). Cada reserva pode ter um **tipo** (Emergência, Viagem...) e pode ser **separada para objetivos** (ver `app/goals/README.md` e [ADR-031](../../docs/adr/031-reservas-alocadas-em-objetivos.md)).

## Contexto

Permite dizer: "Do meu saldo total de R$ 10.000, R$ 2.000 são para emergência". Isso evita a ilusão de riqueza. Com a ADR-031, a reserva também é a origem do dinheiro dos objetivos: o que um objetivo tem é o que foi separado de uma ou mais reservas.

## Especificações técnicas

- **Entidade**: `SavingsGoal` (a UX chama de "Reservas").
- **Tipo**: campo `kind` com lista fixa (`SAVINGS_KINDS` em `lib/goal-allocation.ts`). Padrão `OUTRO`.
- **Saldo**: `currentAmount`. Se a reserva tem investimentos do banco ligados (ADR-028), o saldo vem do banco e não é editado à mão.
- **Separado para objetivos**: `allocatedTo` (lista de objetivo e valor). O livre é o saldo menos o que está separado (`freeOfSavings`).

## Regras de negócio

1. **Saldo virtual**: o dinheiro da reserva não sai da conta bancária real, só fica "carimbado" no sistema.
2. **Separado não some**: não dá para baixar o saldo abaixo do que já está separado para objetivos (400). Antes, retire do objetivo.
3. **Exclusão**: o front pede confirmação quando a reserva tem saldo. A API apaga sem essa checagem. Reserva apagada tira a separação dos objetivos (cascata).
4. **Casal**: reserva marcada como casal entra inteira na conta do casal.

## Componentes

- `SavingsView` / `SavingsGoalCard`: total guardado, lista e, em cada reserva, o tipo e para quais objetivos ela já foi separada.
- `AddSavingsGoalDialog` / `EditSavingsDialog`: criar e editar, com o seletor de tipo. Ainda no desenho antigo de diálogo (próximo passo).

## API

| Evento | Endpoint | Descrição |
| :--- | :--- | :--- |
| Listar / criar / editar / excluir | `GET/POST /savings`, `PUT/DELETE /savings/:id` | `kind` e `currentAmount` aceitos na criação e edição |
| Separar para objetivo | `PUT /goals/:id/allocations/:savingsGoalId` | Ver `app/goals/README.md` |
