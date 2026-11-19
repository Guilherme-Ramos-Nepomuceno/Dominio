# ADR-033: Composição do saldo das reservas, reserva Guardado e ajuste automático

- **Data**: 2026-11-19
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: reservas, investimentos, pluggy, modelo
- **Repositórios**: Dominio (telas e lib) e dominio-api (modelo, regra e migração)
- **Origem**: [PRD-001](../prd/001-reservas-e-objetivos-simplificados.md), fatias 2 e 3. Substitui, na parte do saldo e do vínculo bancário, a [ADR-031](031-reservas-alocadas-em-objetivos.md) e a [ADR-028](../../../dominio-api/docs/adr/028-saude-da-conexao-e-investimentos-da-pluggy.md).

## Contexto e problema

O saldo de uma reserva era um número: digitado à mão ou, com um investimento do banco ligado, a soma do saldo dele. A reserva não dizia em que o dinheiro está, o investimento só podia ir inteiro para uma reserva, quem não usa o Pluggy só tinha um campo de texto, e um resgate no banco deixava o app errado até alguém corrigir.

## Decisão

### O saldo continua gravado; a composição o detalha

`SavingsGoal.currentAmount` segue sendo o total (estatísticas, planejamento, objetivos e o teto da ADR-031 continuam lendo ele). A composição é um detalhamento por cima:

- **Parte do banco** (`InvestmentAllocation`: investimento, reserva, valor). Um investimento pode ser dividido entre várias reservas. Para um mesmo investimento, a soma das partes é o saldo dele.
- **Fonte registrada** (`SavingsSource`: reserva, nome, valor): dinheiro que a pessoa informa pelo nome ("Tesouro Selic", "Poupança"), sem cartão nem banco.
- **Sem detalhar**: o que sobra do saldo fora das duas. É calculado na leitura, nunca gravado. Isso mantém todos os caminhos antigos que escrevem `currentAmount` (sobra do mês, desejos, "Guardar ou retirar", edição) funcionando sem mudança: eles só mexem no "sem detalhar".
- Se o saldo cair por outro caminho abaixo das fontes, a tela mostra as fontes mais novas encolhidas (`composeSavings`, nos dois lados) em vez de somar mais que a reserva tem. Nada é gravado na leitura.

### Reserva padrão Guardado

- `SavingsGoal.isDefault`, uma por pessoa, criada sob demanda (primeiro investimento do banco sem destino, ou "Registrar o que tenho guardado" sem escolher reserva). Kind `GUARDADO`. Não pode ser excluída; some da lista quando zerada.
- Investimento sem destino cai nela. Reserva excluída devolve a parte dos investimentos para Guardado.
- Efeito aceito: **investimentos do banco que antes não estavam ligados a reserva nenhuma passam a contar no total guardado**, em Guardado. Quem digitou à mão um saldo que representa o mesmo investimento vê o valor duas vezes até dar nome ao "sem detalhar" ou remover um dos dois. O app não junta sozinho.

### Ajuste automático (`SavingsCompositionService.reconcile`)

Roda depois de cada sync de investimentos e ao listar investimentos. É idempotente.

- **Ligação antiga** (`PluggyInvestment.savingsGoalId`, investimento inteiro numa reserva) é convertida em parte na primeira rodada, sem somar duas vezes: o saldo da reserva só acompanha a diferença que o banco trouxe. A coluna antiga fica sem uso (ADR-024).
- **Rendimento**: a alta é distribuída na proporção das partes (centavo a centavo, sem perder nem criar).
- **Resgate** (saldo zerou, ou caiu pelo menos 2% e R$ 50): sai primeiro de Guardado; se não bastar, das outras na proporção. Gera um **aviso** com a opção de corrigir.
- **Queda pequena** (mercado oscilando): divide entre todas as partes, sem esvaziar Guardado e sem aviso.
- **Separado para objetivos**: se o saldo de uma reserva fica abaixo do separado, o livre já é zero e a separação dos objetivos é reduzida na proporção. Esta é uma exceção deliberada à regra da ADR-031 de nunca reduzir abaixo do separado, e vale só para mudanças automáticas e para retirada registrada pela pessoa. Mudança pedida de forma explícita (dividir um investimento, editar o saldo) continua recusada com 400 e a mensagem do livre.
- **Avisos** (`SavingsAdjustment`): só para resgate e para corte de objetivo, guardando o texto pronto e o investimento para o "Corrigir". Ficam até a pessoa dispensar. Rendimento não gera aviso.

### Fontes manuais

- Criar uma fonte soma no saldo da reserva (dinheiro novo). Com `fromRest`, só dá nome ao que já estava "sem detalhar" e não soma.
- Atualizar o valor de hoje, guardar mais, retirar, mover de reserva e remover são variações do mesmo `PUT` com o valor absoluto. Valor zero remove.
- Fonte parada há 30 dias pergunta "ainda é esse valor?" dentro da tela, sem notificação.

### Telas

- `/savings` ganha as visões **Reservas** e **Tudo investido** (`?view=invested`). A primeira agrupa por grupo (ADR-032). A segunda mostra os investimentos do banco como o Pluggy retorna (só saldo positivo, por tipo), o grupo "Registrados por você" e o "Sem detalhar", cada um com a reserva de destino. A soma das duas visões é o total guardado.
- O seletor "Reserva" por investimento sai da tela de sincronização do banco, que passa a ter só um resumo com link para Tudo investido. "Ver resgatados" saiu.
- Quem não usa o Pluggy vê o mesmo, sem convite para conectar, só uma linha discreta quando não há investimento do banco.

## Consequências

### Positivas

- Quem não usa o Pluggy e quem usa têm a mesma tela e o mesmo vocabulário.
- Resgate e rendimento no banco não deixam mais a reserva errada.
- Nenhum caminho antigo de escrita do saldo precisou mudar.

### Negativas

- Duas verdades por reserva: o total gravado e a composição calculada. A leitura nunca grava, e a lógica é espelhada em `utils/savings-composition.ts` (API) e `lib/savings-composition.ts` (front), com teste nos dois.
- A conversão da ligação antiga acontece na primeira leitura e não em migration (para não reescrever dados, ADR-024).
- O limiar de resgate (2% e R$ 50) é uma heurística: um resgate pequeno de uma carteira grande é tratado como oscilação e sai na proporção, sem aviso.
- Se a API reconciliar enquanto outra reconciliação está em andamento, vale a unicidade (investimento, reserva); o pior caso é uma rodada refazer o trabalho da outra.

## Links

- [PRD-001](../prd/001-reservas-e-objetivos-simplificados.md), [ADR-031](031-reservas-alocadas-em-objetivos.md), [ADR-032](032-reserva-por-grupo-sem-cartao.md)
- [ADR-024](../../../dominio-api/docs/adr/024-migrations-somente-aditivas.md), [ADR-028](../../../dominio-api/docs/adr/028-saude-da-conexao-e-investimentos-da-pluggy.md)
