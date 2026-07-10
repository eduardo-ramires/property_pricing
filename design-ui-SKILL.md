---
name: design-ui
description: Padrões de design e UI para este projeto de precificação de imóveis (Next.js + Tailwind). Use sempre que for criar ou alterar qualquer tela, componente, página, formulário, dashboard ou elemento visual do produto — mesmo que o pedido não mencione "design" explicitamente (ex: "cria a tela de resultado", "faz um card do imóvel", "monta o formulário de busca").
---

# Design & UI — PrecificaJusta

## Princípio geral

Este é um produto que lida com **confiança e dinheiro** (o usuário está decidindo se um preço é justo ou não). A UI precisa transmitir clareza, seriedade e precisão — não parecer um brinquedo nem um dashboard genérico de template. Evite a estética "SaaS clichê" (gradientes roxo/azul genéricos, cards flutuantes com sombra pesada, ícones fofos demais).

## Identidade visual

- **Paleta:** tons neutros (cinza/branco/preto) como base + UMA cor de destaque para os indicadores de preço (ex: verde = abaixo do mercado, amarelo/âmbar = dentro do mercado, vermelho = acima do mercado). Não inventar cores aleatórias — o semáforo de preço é o elemento visual mais importante do produto e precisa ser consistente em toda a aplicação.
- **Tipografia:** uma fonte sans-serif legível (Inter, Geist, ou similar via next/font). Números (preços, m², índices) sempre em fonte tabular/monoespaçada quando exibidos em tabela ou comparação, para alinhar visualmente.
- **Densidade:** priorizar clareza sobre densidade de informação. Corretores e donos de imóvel vão usar isso rápido, muitas vezes no celular — não sobrecarregar a tela.

## Componentes-chave do produto (pensar nestes desde já)

1. **Indicador de índice de desvio** — o componente mais importante. Precisa comunicar em 1 segundo se o preço está abaixo/dentro/acima do mercado. Pensar em algo como um selo, badge ou medidor visual (gauge), nunca só um número solto sem contexto.
2. **Card de imóvel** — resumo compacto com foto (se houver), preço anunciado, m², e o indicador acima.
3. **Tela de comparáveis** — lista/tabela dos imóveis usados para calcular o índice, para dar transparência ao cálculo (importante para credibilidade — o usuário precisa confiar no número).
4. **Formulário de busca/consulta** — simples, poucos campos obrigatórios (endereço/bairro, tipo, m²).

## Regras técnicas

- Tailwind CSS: usar classes utilitárias padrão do projeto, nunca CSS inline salvo casos excepcionais.
- Componentes reutilizáveis em `components/ui/` (padrão shadcn/ui é bem-vindo para primitives — button, card, badge, dialog).
- Mobile-first: toda tela nova deve ser desenhada pensando em mobile primeiro, depois expandida para desktop.
- Acessibilidade mínima: contraste adequado (especialmente no semáforo verde/amarelo/vermelho — pensar em daltonismo, usar ícone + cor, nunca só cor).
- Evitar bibliotecas de ícones pesadas — lucide-react é suficiente.

## O que evitar

- Não usar dados fake "bonitinhos demais" nas telas de exemplo — usar números realistas de imóveis (ex: R$ 320.000, não R$ 999.999).
- Não adicionar animações/transições supérfluas antes de a funcionalidade core estar validada.
- Não copiar layout de dashboard genérico (sidebar + 4 cards de métrica) sem antes pensar se faz sentido pro fluxo real do usuário.
