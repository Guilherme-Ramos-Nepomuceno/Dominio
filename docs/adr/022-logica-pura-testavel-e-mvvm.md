# ADR-022: Lógica pura em `lib/` testada com `node --test`, telas em view-model + view

- **Data**: 2026-11-05
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: arquitetura, testes

## Contexto e problema

As regras de dinheiro (limite do dia, divisão do casal, bússola, contas a pagar, parcelas) são o ponto onde um erro custa mais caro, e cresciam dentro dos componentes React, onde não dá para testar sem montar a tela. O projeto não tem Jest nem Vitest no front, e o Next.js desta versão tem convenções próprias, que mudam com frequência.

## Opções consideradas

- Funções puras em `lib/*.ts`, sem alias `@/`, testadas com o test runner nativo do Node
- Adicionar Vitest e React Testing Library ao front
- Manter a lógica nos componentes e testar só manualmente

## Decisão

- Cálculo e regra de negócio ficam em `lib/*.ts` como funções puras: sem React, sem `fetch` e sem alias `@/`, para o Node importar direto. Exemplos: `home.ts`, `recurring.ts`, `couple-split.ts`, `compass.ts`, `pending.ts`, `week.ts`, `wins.ts`.
- Os testes ficam em `lib/__tests__/*.test.ts` e rodam com `npm test` (`node --no-warnings --test`). Hoje são 129.
- Cada tela segue o padrão MVVM: `use-*-view-model.ts` busca os dados e guarda o estado, e `*-view.tsx` só desenha.
- Antes de cada commit: `npx tsc --noEmit -p .` e `npm test`.

### Consequências positivas

- As regras são testadas em milissegundos, sem navegador.
- Quando o backend repete um cálculo, como o limite da semana, as duas versões podem ser comparadas com os mesmos casos.

### Consequências negativas

- Não há teste de componente nem de ponta a ponta. A interface é conferida só no navegador, à mão.
- A regra "sem alias" é fácil de esquecer, e o erro só aparece ao rodar os testes.

## Links

- [ADR-017](017-bussola-no-lugar-de-estatisticas.md), [ADR-019 (dominio-api)](../../../dominio-api/docs/adr/019-divisao-das-contas-do-casal.md)
