# Módulo de Objetivos (Goals)

Metas de economia com o progresso vindo das reservas. Decisão completa em [ADR-031](../../docs/adr/031-reservas-alocadas-em-objetivos.md).

## Contexto

O objetivo ("Viagem", "Carro novo") não guarda dinheiro por si. O dinheiro está numa **reserva** (`SavingsGoal`, ver `app/savings/README.md`), e o objetivo mostra quanto dessas reservas foi separado para ele.

## Regras de negócio

1. **Progresso = soma das alocações.** `currentAmount` na resposta da API é a soma do que cada reserva separou para o objetivo. O front não envia progresso.
2. **Separar é valor absoluto.** Em "Separar de uma reserva", o valor digitado é o total desta reserva para este objetivo. Zero tira a separação.
3. **Limite da reserva.** Um objetivo só pode receber o que está livre na reserva (saldo menos o que outros objetivos já recebem). A API recusa o excedente.
4. **Livre.** O total livre nas reservas aparece no topo da tela, para mostrar o dinheiro que ainda não tem destino.
5. **Excluir objetivo** não mexe nas reservas: o dinheiro volta a ser só "livre".
6. **Progresso passa de 100%** quando a meta é superada. A barra para em 100%, e a meta aparece como alcançada.

## Componentes

- `GoalsView` (`components/goals-view.tsx`): página corrida com o total separado, o livre e a lista.
- `GoalRow` (`components/goal-row.tsx`): um objetivo, com a barra e as reservas de onde vem o dinheiro.
- `GoalFormSheet` (`components/goal-form-sheet.tsx`): nome, quanto custa, prazo opcional e ícone.
- `AllocateFundsSheet` (`components/allocate-funds-sheet.tsx`): escolhe a reserva, mostra o livre e recebe o valor.
- `goal-icons.ts`: ícones de objetivo (o nome é o que vai para a API).

## Lógica

- `lib/goal-allocation.ts`: `freeOfSavings`, `availableForGoal`, `allocationFor`, `goalProgress`, `validateAllocationAmount` (com teste).
- `useGoalsViewModel`: carrega objetivos e reservas, e chama `allocateGoalFunds` / `removeGoalAllocation` (em `lib/storage.ts`).

## API

| Ação | Endpoint |
| :--- | :--- |
| Listar / criar / editar / excluir | `GET /goals`, `POST /goals`, `PUT /goals/:id`, `DELETE /goals/:id` |
| Separar (valor absoluto) | `PUT /goals/:id/allocations/:savingsGoalId` com `{ amount }` |
| Tirar a separação | `DELETE /goals/:id/allocations/:savingsGoalId` |
