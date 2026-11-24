# ADR-034: Cache das leituras com TanStack Query e invalidação por domínio

- **Data**: 2026-11-24
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: front, desempenho, dados, cache
- **Repositórios**: Dominio

## Contexto e problema

Toda tela buscava os próprios dados ao montar (`useState` + `useEffect` chamando `lib/storage.ts`) e mostrava o skeleton até a resposta chegar. Trocar de tela era carregar de novo, mesmo sem nada ter mudado. O pior caso era o histórico de transações: `/transactions` devolve o histórico inteiro (o mês é filtrado no cliente) e era baixado de novo em cada tela e a cada volta para a Home.

Os dados quase não mudam sozinhos: mudam quando a própria pessoa grava algo (lançamento, categorização, plano) ou quando chega coisa do banco (sync da Pluggy). Os dois casos já disparavam o evento `storage-update`, mas a reação era recarregar tudo: cerca de 40 ouvintes buscando de novo todas as suas leituras a cada gravação, com o skeleton voltando.

O que existia de "cache" era o `readsInFlight` (`lib/in-flight.ts`): juntava chamadas iguais feitas **ao mesmo tempo**, mas não guardava nada depois da resposta.

## Opções consideradas

1. **Zustand (ou outro store de estado)**: é feito para estado do cliente. Usado como cache de dados da API, teríamos de construir à mão chave por conta, dado velho × fresco, revalidação em segundo plano, invalidação seletiva e corrida entre requisições.
2. **Cache caseiro no `sharedRead`** (guardar a última resposta e devolver enquanto revalida): resolveria a maior parte com pouca mudança, mas continuaria sem invalidação seletiva e viraria uma versão caseira do item 3.
3. **TanStack Query**: cache de dados de servidor com chave, `staleTime`, revalidação em segundo plano, deduplicação e invalidação por chave. As funções de `lib/storage.ts` já servem de `queryFn` sem mudança.
4. **SWR**: mesma ideia do 3, mais enxuto, com menos controle sobre invalidação por predicado e sobre leitura imperativa (`fetchQuery`).

## Decisão

**TanStack Query (v5)**, com as regras abaixo.

### Chaves e cliente (`lib/query-client.ts`)

- Toda chave é `[raiz, conta, ...resto]`. A conta é o usuário logado mais a conta ativa (pessoal, casal ou parceiro), porque a mesma rota devolve dados diferentes conforme a conta. Sem isso, o cache de uma conta vazaria para a outra.
- `staleTime` de 5 minutos, `gcTime` de 30 minutos, revalida ao voltar para o app (`refetchOnWindowFocus`), não repete erro 4xx.
- Login, logout e sessão expirada (`auth-change`) apagam o cache inteiro.
- Trocar de conta continua recarregando a página (`selectAccount`), o que também zera o cache.

### Leituras

- `hooks/queries.ts` tem um hook por leitura. As telas usam esses hooks; ninguém monta chave à mão.
- O dado do cache é o mesmo objeto para todos os componentes: filtrar e ordenar sempre com cópia, nunca alterar no lugar.
- O carregamento (skeleton) aparece só na primeira leitura (`isPending`). Revalidações em segundo plano mostram o que já está na tela.
- Leituras fora de componentes (handler de salvar, validação antes de gravar) usam `lib/cached-reads.ts` (`fetchQuery`), que passa pelo mesmo cache.
- Leituras internas de uma gravação em `lib/storage.ts` (ex.: `addTransaction` conferindo o tipo do cartão) continuam indo direto à API, de propósito, para usar dado fresco.

### Invalidação por domínio (`lib/data-events.ts`, `lib/cache-domains.ts`)

Cada gravação avisa qual **domínio** mexeu: lançamentos, categorias, cartões, reservas, objetivos, configurações, plano, regras, banco, revisão do banco ou família. `DOMAIN_INVALIDATES` diz quais raízes de chave dependem de cada domínio, e o `QueryProvider` invalida só essas. O mapa é conservador: na dúvida, invalida, porque buscar de novo é barato e mostrar dado errado não é. Exemplo: lançar um gasto invalida lançamentos, inbox, plano, faturas e totais do mês, mas não categorias, cartões, reservas, objetivos, configurações nem regras.

São dois avisos:

- **`notifyDataChanged`** dispara `storage-update` com os domínios. Era o evento que já existia; quem ainda escuta direto continua recarregando.
- **`invalidateCachedData`** dispara `data-changed`, que só o cache escuta. É usado nas gravações que antes não avisavam ninguém: CRUD de categoria, cartão, reserva e objetivo, regras, conexão e contas do banco, configurações e cada linha editada na revisão do banco. Fazê-las disparar `storage-update` faria telas antigas recarregarem no meio de uma edição.

### Edição em andamento

Telas com edição local (plano, revisão do banco, configurações e formulários) mantêm o estado local preenchido a partir do cache. Uma revalidação em segundo plano não substitui o que a pessoa está editando:

- **Plano**: a versão otimista fica por cima do cache durante a gravação, e a resposta do servidor é escrita no cache com `setQueryData`.
- **Revisão do banco**: a fila segue o cache até a primeira edição. Dali em diante é uma cópia local, que só volta ao cache numa recarga explícita (sincronizar, confirmar).

### O que saiu

- `readsInFlight` e `lib/in-flight.ts`: o cache já junta chamadas iguais pela chave.
- `getPendingTransactions`: as pendências são derivadas da lista de transações do cache.
- As recargas manuais depois de gravar e os ouvintes de `storage-update`, `plan-update` e `settings-update` das telas migradas.

## Consequências

### Positivas

- Voltar para uma tela já visitada mostra o dado na hora, sem baixar o histórico de novo. O E2E `e2e/cache.spec.ts` cobre isso.
- Trocar de mês é filtro em memória sobre o histórico já carregado.
- Uma gravação busca de novo só o que depende dela. O E2E garante que lançar um gasto não rebusca categorias, cartões, reservas e configurações.
- Menos código de carregamento espalhado. Os avisos de lint `set-state-in-effect` dos hooks migrados sumiram.

### Negativas

- **Mudança vinda de fora** (outro aparelho, o parceiro, o webhook da Pluggy no servidor) leva até 5 minutos para aparecer se a pessoa não sair e voltar ao app. Isso inclui o mês da fatura aberta, que vem do cache de cartões.
- **Salvar e fechar** agora acontece antes da lista atualizar, e a tela se ajusta um instante depois. Pagar fatura e confirmar pendência ainda esperam a lista nova, para não permitir clique duplo sobre o que acabou de ser pago.
- **Toda gravação nova** precisa avisar o domínio certo. Sem aviso, a tela que lê do cache fica com o dado velho até o `staleTime` vencer.
- **Ponto ainda sem cache**: na tela do banco, as contas de cada banco conectado continuam carregando do jeito antigo.

## Links

- `lib/query-client.ts`, `lib/cache-domains.ts`, `lib/data-events.ts`, `hooks/queries.ts`, `lib/cached-reads.ts`, `components/session/query-provider.tsx`
- Testes: `lib/__tests__/cache-domains.test.ts`, `e2e/cache.spec.ts`
