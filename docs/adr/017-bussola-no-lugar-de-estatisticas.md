# ADR-017: Bússola no lugar de Estatísticas, comparando o mesmo trecho do período

- **Data**: 2026-11-05
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: produto, cálculo

## Contexto e problema

A tela Estatísticas mostrava gráficos de barras empilhadas, parecidos com os da tela Semana, sem responder a uma pergunta clara. O que interessa é saber o que está fugindo do normal. Comparar o mês em andamento com meses anteriores inteiros engana: o gasto variável que ainda vai acontecer parece economia.

## Opções consideradas

- Desvio por categoria contra a média dos meses anteriores, no mesmo trecho do período
- Desvio contra o mês anterior inteiro
- Manter as barras empilhadas e só melhorar o visual

## Decisão

- A tela passa a se chamar **Bússola**.
- A lógica fica em `lib/compass.ts`, com testes:
  - Para cada categoria, `compassDeviation` compara o gasto do período com a média dos períodos anteriores.
  - `sameStretch` corta cada período anterior no mesmo número de dias já decorridos do período atual. Se hoje é o dia 12, a comparação usa os dias 1 a 12 dos meses anteriores.
  - Desvios menores que R$ 10 (`MIN_COMPASS_DIFF`) não aparecem.
- O gráfico de barras empilhadas foi removido (`stacked-bar-chart.tsx`).
- Os filtros ficam lado a lado (cartões e categorias; tudo, débito e crédito; aberto e pago).
- Os ícones usam a cor do grupo do plano.

### Consequências positivas

- Responde a uma pergunta só, e sem falso alarme no começo do mês.
- Cálculo puro e testado, independente da interface.

### Consequências negativas

- Contas novas, sem meses anteriores, ficam sem comparação.
- A média simples sofre com meses atípicos, como os de compras grandes.

## Links

- [ADR-013](013-pagina-corrida-sem-cartoes.md), [ADR-022](022-logica-pura-testavel-e-mvvm.md)
