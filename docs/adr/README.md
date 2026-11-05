# Architecture Decision Records

A numeração é única entre o front (Dominio) e a API (dominio-api), em ordem cronológica. Cada ADR fica no repositório em que a decisão tem mais impacto.

ADRs não são editados: uma decisão nova substitui a antiga num ADR novo, com o status "Substituído por ADR-NNN".

**001–012**: mudança de conceito para planejamento, segurança e deploy (30/10 a 02/11/2026).  
**013–024**: redesenho das telas, casal e regras sugeridas (05/11/2026).

| ADR | Decisão | Repositório |
|-----|---------|-------------|
| [001](001-de-registro-para-planejamento.md) | De registro para planejamento: a torre do mês | Dominio |
| [002](../../../dominio-api/docs/adr/002-desejos-do-mes.md) | Desejos do mês | dominio-api |
| [003](../../../dominio-api/docs/adr/003-limite-semanal-dinamico.md) | Limite semanal dinâmico | dominio-api |
| [004](../../../dominio-api/docs/adr/004-inicio-do-mes-configuravel.md) | Início do mês configurável | dominio-api |
| [005](../../../dominio-api/docs/adr/005-categoria-opcional-e-caixa-a-classificar.md) | Categoria opcional e caixa A classificar | dominio-api |
| [006](../../../dominio-api/docs/adr/006-categorizacao-em-servico-unico.md) | Categorização em serviço único (5 fontes) | dominio-api |
| [007](../../../dominio-api/docs/adr/007-sincronizacao-automatica-da-pluggy.md) | Sincronização automática da Pluggy | dominio-api |
| [008](../../../dominio-api/docs/adr/008-rituais-pwa-e-web-push.md) | Rituais, PWA e web push | dominio-api |
| [009](../../../dominio-api/docs/adr/009-eventos-de-produto-e-admin.md) | Eventos de produto e tela de admin | dominio-api |
| [010](010-vitorias-e-sequencia-no-azul.md) | Vitórias e sequência no azul | Dominio |
| [011](../../../dominio-api/docs/adr/011-endurecimento-de-seguranca-da-api.md) | Endurecimento de segurança da API | dominio-api |
| [012](012-hospedagem-e-ordem-de-publicacao.md) | Hospedagem e ordem de publicação | Dominio |
| [013](013-pagina-corrida-sem-cartoes.md) | Página corrida sem cartões, cor só com significado | Dominio |
| [014](014-navegacao-flutuante-e-voltar.md) | Menu inferior flutuante e Voltar com trilha | Dominio |
| [015](015-hierarquia-da-home.md) | Home de hoje para o mês | Dominio |
| [016](016-componentes-de-formulario-unicos.md) | FormSheet e AppSelect como componentes únicos | Dominio |
| [017](017-bussola-no-lugar-de-estatisticas.md) | Bússola no lugar de Estatísticas | Dominio |
| [018](../../../dominio-api/docs/adr/018-sobra-da-semana-configuravel.md) | Sobra ou excesso da semana configurável | dominio-api |
| [019](../../../dominio-api/docs/adr/019-divisao-das-contas-do-casal.md) | Divisão das contas fixas do casal | dominio-api |
| [020](../../../dominio-api/docs/adr/020-regras-sugeridas-pelo-historico.md) | Regras de categoria sugeridas pelo histórico | dominio-api |
| [021](../../../dominio-api/docs/adr/021-despesa-por-meio-de-pagamento.md) | Gasto do mês soma débito e crédito | dominio-api |
| [022](022-logica-pura-testavel-e-mvvm.md) | Lógica pura testável e MVVM | Dominio |
| [023](../../../dominio-api/docs/adr/023-backend-como-fonte-dos-dados-padrao.md) | Backend como única fonte dos dados padrão | dominio-api |
| [024](../../../dominio-api/docs/adr/024-migrations-somente-aditivas.md) | Migrations somente aditivas | dominio-api |
