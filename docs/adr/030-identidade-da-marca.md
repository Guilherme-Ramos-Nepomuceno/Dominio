# ADR-030: Identidade da marca: "Seu mês no azul.", ícone Torre em D e azul ultramar

- **Data**: 2026-11-18
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: marca, ui, produto

## Contexto e problema

O produto mudou de registro para planejamento (ADR-001), mas a marca continuou falando do app antigo. O ícone mostrava barras neon, uma pizza vermelha e receita contra despesa, que é a estatística que a ADR-017 tirou do app. O vermelho do ícone punia antes mesmo de abrir. O app não tinha cor própria (`--primary` é quase preto ou quase branco), e ainda carregava 8 matizes do template (`--chart-1..5`, `--savings`, `--wallet`, `--hobby`) que não significavam nada. O nome "Domínio" fala de controle, enquanto o produto entrega permissão com calma: quanto dá pra gastar hoje.

## Fatores de decisão

- A marca precisa dizer o que o app faz antes da pessoa abrir.
- Manter o nome: todo o sistema, inclusive os repositórios, já se chama Domínio.
- A interface continua neutra, com cor só quando ela significa algo (ADR-013 e ADR-015).
- Recompensa sem castigo (ADR-010).

## Opções consideradas

- Nome: manter "Domínio" ou trocar ("No Azul", "Anil", "Folga").
- Ícone: Torre em D, Mascote, Bússola em D, Horizonte.
- Cor: ultramar "no azul", grafite puro, âmbar.
- Fonte: só Plus Jakarta; Jakarta + Bricolage Grotesque; Jakarta + Fraunces.

## Decisão

**Nome e frases.** O nome continua Domínio. A ligação com o azul vem do sentido: ter domínio não é se privar, é saber quanto dá pra gastar. São quatro frases, cada uma com um papel fixo (`lib/brand.ts`):

| Papel | Frase | Onde |
|---|---|---|
| Assinatura | Seu mês no azul. | Junto da marca: login, título da página |
| Explicação | Ter domínio não é cortar tudo. É saber quanto dá pra gastar hoje. | Criar conta, descrição do app e do PWA |
| Chamada | Domine o mês. Fique no azul. | Notificação do começo do mês (API, `monthPlanPayload`) |
| Conquista | Seu mês, seu domínio. | Plano confirmado e mês fechado no azul (`monthClosedToast`) |

Regras: ao lado da marca, só a assinatura. Nenhuma tela mostra duas frases. A conquista só aparece quando aconteceu, e um mês estourado fecha em tom neutro.

**Ícone: Torre em D.** O D de Domínio é feito das camadas da torre do mês: orçamento, grupos e, embaixo, a margem livre em azul-claro. O desenho mestre é `public/brand/icon.svg`, e os PNGs do PWA saem de `scripts/brand-icons.mjs`. No app, o desenho é o `BrandMark` (`components/brand/brand.tsx`).

**Ícone ou só o D.** O ícone completo (fundo azul arredondado com as camadas brancas) aparece só onde é ícone de fato: favicon, PWA e metadados. Dentro do sistema, no cabeçalho, no menu, no login e no carregamento, aparece só o D em torre, na cor da marca (`BrandMark`), com a margem livre mais clara.

**Carregando no próprio D.** Não existe tela de abertura nem tela de transição, porque as telas já têm skeleton. Quem mostra que o app está buscando dados é o D da marca no cabeçalho. Enquanto há chamada à API em andamento, ele troca (crossfade) para o D carregando. Nessa animação, uma onda de luz sobe pelas camadas, de baixo para cima, como o plano se montando. O D respira e tem luz de esfera só sobre as faixas, com intensidade ajustada ao tema.

- O contador de chamadas fica no `fetchApi` (`lib/api-activity.ts`), e o `useApiBusy` decide quando animar.
- A animação só começa depois de 300 ms, porque um carregamento rápido já fica coberto pelo skeleton. Depois de começar, dura pelo menos 1,2 s, para não piscar.
- É só CSS (`.brand-loader*` em `globals.css`). Com `prefers-reduced-motion`, fica parado.

**Proporção da marca escrita.** O D tem 1,1em de altura e fica centrado na haste do "d" da Bricolage (0,72em, medida), crescendo igual para cima e para baixo. Assim ele se destaca como símbolo, sem desalinhar da palavra.

**Cabeçalho.** A marca fica à esquerda e leva para a Home. À direita ficam os avisos, o mês e a conta. No desktop, a marca no topo do menu também leva para a Home.

**Marca escrita.** "domínio" em minúsculas, na Bricolage, com o acento do í em azul como único detalhe de cor (`BrandWordmark`).

**Cor: ultramar.** `--brand` vale `#2340e8` no claro e `#8199ff` no escuro. Usos: marca, anel de foco (`--ring`) e o ícone da sequência no azul. A cor de marca **nunca entra em gráfico**, onde ficam as cores dos grupos do plano. Por isso o azul de Essenciais (`--plan-essentials`) continua como está. O verde continua reservado às vitórias (ADR-010).

**Fonte.** A Plus Jakarta Sans continua na interface. A Bricolage Grotesque (`font-display`) entra só no número "Para gastar hoje", nos títulos de tela (`PageHeader`), no título do plano confirmado e na marca.

**Limpeza.** Saíram `--chart-1..5`, `--savings`, `--wallet`, `--hobby` e o `styles/globals.css`, que não era importado. Os gráficos de série única usam `--series`, inclusive as despesas do dia na Home. Saiu também o `--sidebar-primary` (ciano, sem uso). As cores do Tailwind soltas viraram tokens: o âmbar de atenção virou `--attention` (preenchimento, sempre com rótulo) ao lado de `--attention-ink` (texto), e o vermelho virou `--destructive`.

**Paleta casada.** As cores que vieram de antes foram ajustadas para conversar com o ultramar:

- Valor de receita escrito usa `--positive-ink` (6:1 no claro). O `--income` fica para barra e ponto, porque como texto no claro dava 1,9:1.
- No escuro, `--income` deixou o lima neon (matiz 126) e virou um verde de verdade (matiz 145, o mesmo do claro). Antes, ele ficava colado no âmbar de atenção, inclusive para daltônicos.
- `--series` saiu do azul-celeste (230) para a família do ultramar (248 no claro, 244 no escuro), sem ser a cor da marca.
- O ponto de "Rascunho" do plano é neutro. No claro, o âmbar de atenção era a mesma cor de Desejos, na mesma tela.
- O `--card` do escuro ganhou o mesmo cinza-azulado (matiz 247) do fundo e das bordas.
- A barra do sistema e a abertura do PWA usam o fundo do tema (`SYSTEM_BAR_COLOR` em `lib/theme.ts`), em vez de `#18181e` nos dois. O `setTheme` atualiza o `theme-color` quando a pessoa escolhe o tema no app.

## Consequências

### Positivas

- A cor, o ícone e a frase contam a mesma história: estar no azul.
- O ícone mostra o modelo do produto, e não um enfeite, e continua legível a 29 px.
- Com as frases centralizadas em `lib/brand.ts` e na API, o texto não se espalha.

### Negativas

- O azul é comum entre bancos. A diferença vem do tom e da forma do ícone.
- A chamada fica duplicada na API (`BRAND_CALL`) e precisa ser mantida igual à do app.
- Quem já instalou o PWA pode continuar vendo o ícone antigo até reinstalar, ou até o sistema atualizar o manifesto.

## Links

- [ADR-001](001-de-registro-para-planejamento.md), [ADR-010](010-vitorias-e-sequencia-no-azul.md), [ADR-013](013-pagina-corrida-sem-cartoes.md), [ADR-015](015-hierarquia-da-home.md), [ADR-017](017-bussola-no-lugar-de-estatisticas.md)
- [ADR-008 (dominio-api)](../../../dominio-api/docs/adr/008-rituais-pwa-e-web-push.md)
