# ADR-001: Domínio passa de app de registro para app de planejamento (a torre do mês)

- **Data**: 2026-10-30
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: produto, arquitetura, banco

## Contexto e problema

O app cobria o registro de ponta a ponta: cartões, faturas, extratos, Pluggy, contas a pagar e casal. Mesmo assim, era **reativo**: quase todas as telas respondiam "o que aconteceu?" e nenhuma respondia "quanto ainda posso gastar?". Não havia um momento recorrente de uso, e a retenção não virava hábito. A única ferramenta de controle era um número global (`Setting.spendingGoal`) e metas por categoria em percentual, guardadas num JSON solto (`categoryGoals`).

## Fatores de decisão

- Para trocar um hábito de consumo, é preciso planejar o gasto desejado, e não só cortar o indesejado.
- Cada ritual deve responder uma pergunta com um número.
- Não perder nenhum dado existente.

## Opções consideradas

- Plano mensal por período, em tabelas próprias: a torre
- Evoluir o `spendingGoal` e o `categoryGoals` que já existiam
- Só melhorar relatórios e alertas

## Decisão

Escolhida: **plano mensal em tabelas próprias**, mostrado como uma torre:

1. **Orçamento** no topo. Vem das receitas previstas e pode ser editado.
2. **Quatro grupos** padrão, que podem ser renomeados (`CategoryGroup`): Essenciais, Estilo de vida, Desejos e Futuro. Cada categoria pertence a um grupo (`Category.groupId`).
3. **Margem livre** na base. Ela alimenta os desejos (ADR-002).

Cada categoria tem duas partes:
- **Comprometido:** calculado e travado (recorrências, parcelas e contas do mês).
- **Planejado variável:** a pessoa decide (`MonthPlanCategory.plannedVariable`).

O `MonthPlan` tem status (rascunho → confirmado → encerrado) e guarda o plano original para comparar no fechamento. O primeiro plano vem como rascunho, com o planejado do mês anterior ou a média dos últimos 3 meses. Comprometido, gasto e limites são **calculados, nunca salvos**. A conta do casal tem o próprio plano.

### Consequências positivas

- O app ganha uma pergunta para o começo do mês ("quanto sobra?") e uma base para o limite semanal (ADR-003).
- Separar o comprometido do variável evita contar o aluguel duas vezes.

### Consequências negativas

- Planejar dá trabalho, e o rascunho automático é o que reduz esse risco.
- Uma renda irregular deixa o topo da torre errado até ser ajustada.
- O `spendingGoal` e o `categoryGoals` viraram legado, e só servem de valor inicial.

## Links

- PRD "Domínio: do registro ao planejamento" (Claude Docs)
- [ADR-002](../../../dominio-api/docs/adr/002-desejos-do-mes.md), [ADR-003](../../../dominio-api/docs/adr/003-limite-semanal-dinamico.md), [ADR-004](../../../dominio-api/docs/adr/004-inicio-do-mes-configuravel.md)
