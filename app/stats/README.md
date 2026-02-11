# Módulo de Estatísticas (Stats)

Dashboard analítico avançado para visualização de saúde financeira.

## Contexto

Oferece gráficos (`StackedBarChart`) e listas detalhadas de transações para auditoria de gastos. Inclui funcionalidade poderosa de "Fatura Pendente" para auditar gastos futuros de cartão de crédito.

## Especificações Técnicas

### Modos de Visualização (`filterType`)

1. **Geral (`all`)**: Mostra fluxo de caixa real (entradas e saídas efetivadas/pendentes do mês).
2. **Fatura Pendente (`credit`)**:
   - **Mode**: Projeção.
   - **Lógica**: "Explode" transações parceladas passadas para encontrar parcelas que caem no mês selecionado.
   - **Utilidade**: Permite conferir itens da fatura antes dela fechar.

### Gráficos

- **StackedBarChart**: Gráfico de barras empilhadas mostrando evolução de gastos/receitas dia a dia ou acumulado.
- **Threshold**: Linha de meta de gastos ajustável diretamente pelo gráfico.

### UX Features

- **Swipe-to-Delete (Mobile)**: Implementação manual de gestos de toque (`onTouchStart`, `onTouchMove`) para revelar botão de exclusão.
- **Alertas de Categoria**: Verifica se gastos por categoria excederam a % definida em Settings.

## Regras de Negócio

1. **Auditoria de Cartão**: No modo `credit`, o sistema ignora transações já marcadas como `paid`, focando no passivo pendente.
2. **Data Ajustada**: Para projeções de cartão, a data de exibição é forçada para o mês atual (para agrupamento visual), mas a `originalDate` é preservada para mostrar "Comprou em: DD/MM".

## API / Events

| Evento | Detalhes |
| :--- | :--- |
| **Threshold Change** | Atualiza `spendingGoal` nas configurações globais quando o usuário arrasta a linha de meta no gráfico. |
| **Undo Transaction** | Reverte uma transação para o estado anterior ou a exclui. |

## Diretrizes de Estilo

Usa `AnimatePresence` e transições CSS manuais para o efeito de Swipe.
