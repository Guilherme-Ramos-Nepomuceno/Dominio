# Módulo All Menus (Navegação Completa)

Central de navegação rápida que expõe todas as funcionalidades do aplicativo em uma grid unificada.

## Contexto

Serve como um "Sitemap" visual para o usuário, facilitando o acesso a funcionalidades que podem não estar na barra de navegação principal (tabbar inferior) ou para usuários que preferem uma visão holística.

## Especificações Técnicas

### Componentes Principais

- `AllMenusPage` (`page.tsx`): Renderiza uma grid de links estáticos.
- `Phosphor Icons`: Utiliza ícones visuais para cada entrada de menu.

### Configuração

A lista de menus é definida num array constante `allMenus` contendo:

- `href`: Rota de destino
- `icon`: Componente de ícone
- `label`: Título
- `description`: Subtítulo explicativo

## Regras de Negócio

- Não possui lógica de estado ou efeitos colaterais.
- Apenas redirecionamento via `Link` do Next.js.

## Diretrizes de Uso

Para adicionar um novo item no menu:

1. Importe o ícone desejado.
2. Adicione um objeto ao array `allMenus`.

```typescript
{ 
  href: "/nova-funcionalidade", 
  icon: NewIcon, 
  label: "Nova Funcionalidade", 
  description: "Descrição curta" 
}
```
