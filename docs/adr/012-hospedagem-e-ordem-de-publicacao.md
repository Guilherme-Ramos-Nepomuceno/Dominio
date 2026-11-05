# ADR-012: Front na Vercel, API no Render e ordem fixa de publicação

- **Data**: 2026-10-30
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: infraestrutura, deploy

## Contexto e problema

O front e a API são repositórios separados, publicados separadamente. As mudanças de segurança (ADR-011) e de banco (ADR-024) podem derrubar a produção se a configuração ou o banco não estiverem prontos antes do código. O front tinha dois gerenciadores de pacote misturados, o que deixa as instalações imprevisíveis.

## Opções consideradas

- Vercel (front) e Render (API), com ordem de publicação definida
- Um único provedor para os dois
- Publicar cada repositório à medida que fica pronto, sem ordem definida

## Decisão

- **Front** na Vercel (`dominio-fawn.vercel.app`), e **API** no Render, atrás de proxy, por isso `TRUST_PROXY=1`.
- **npm** é o gerenciador de pacotes dos dois repositórios.
- **Ordem de publicação:**
  1. variáveis de ambiente no Render (`JWT_SECRET`, `TRUST_PROXY`, `CORS_ORIGINS` quando necessário);
  2. migrations da API;
  3. push da branch, que não publica nada;
  4. merge na `main`, que publica a API;
  5. front;
  6. teste de login no domínio de produção.
- Funcionalidade nova só vai para produção depois de compilar e testar localmente por completo. Scripts de correção de dados podem rodar quando necessário.
- O README informa que só o front está publicado, para testes.

### Consequências positivas

- Cada provedor faz o que faz melhor, e o deploy segue sempre o mesmo roteiro.
- Configurar as variáveis antes do merge evita derrubar a API com a validação nova.

### Consequências negativas

- Coordenar dois deploys é manual, e não há pipeline que garanta a ordem.
- O plano gratuito do Render pode "dormir" e deixar a primeira requisição lenta.
- **Pendência:** o front ainda tem `pnpm-lock.yaml` ao lado do `package-lock.json`. Falta remover o arquivo do pnpm.

## Links

- [ADR-011 (dominio-api)](../../../dominio-api/docs/adr/011-endurecimento-de-seguranca-da-api.md), [ADR-024 (dominio-api)](../../../dominio-api/docs/adr/024-migrations-somente-aditivas.md)
