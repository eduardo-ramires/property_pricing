# CLAUDE.md

Este arquivo orienta o Claude Code (e qualquer instância do Claude) ao trabalhar neste repositório.

## Visão geral do projeto

**Nome provisório:** PrecificaJusta (ajustar quando definirem o nome final)

**Problema que resolve:** Não existe uma régua objetiva de precificação de imóveis. Proprietários e corretores anunciam valores baseados em percepção, avaliação subjetiva ou pressão de mercado, o que gera:
- Descolamento entre preço anunciado e preço real de mercado
- Demora para vender/alugar
- Perda de percepção de valor do imóvel/imobiliária
- Instabilidade e insegurança na tomada de decisão (dono, corretor, gestor, inquilino)

**Hipótese central da solução:** Cruzar dados de **transações reais** (o que efetivamente foi vendido/alugado) com dados de **ofertas ativas** (o que está anunciado nos portais) para gerar um índice de aderência ao mercado por imóvel/região/tipo.

```
Preço justo estimado = f(transações reais da região + tipo de imóvel + características)
Preço anunciado       = valor publicado no portal
Índice de desvio      = (Anunciado - Justo) / Justo
```

Esse índice é o núcleo do produto. Toda funcionalidade deve, direta ou indiretamente, alimentar ou expor esse índice.

## Personas (não perder de vista ao tomar decisões de UX/API)

| Persona | Dor principal | O que precisa ver |
|---|---|---|
| Dono do imóvel | Não sabe se o preço pedido é justo | Faixa de preço sugerida, comparáveis |
| Corretor / Gestor | Precisa justificar avaliação, responsável pelo sucesso do negócio | Relatório com comparáveis e fontes |
| Inquilino / Comprador | Não sabe se está pagando caro | Selo "abaixo / dentro / acima do mercado" |

## Fontes de dados (a validar viabilidade técnica de cada uma)

- CIB — cadastro de imóveis
- CREI / bases de transações imobiliárias
- Portais (Viva Real, ZAP, QuintoAndar, OLX etc.) — via API oficial se existir, scraping como fallback
- Dados públicos de cartório / prefeitura (quando disponíveis)

Para o MVP, é aceitável e recomendado **recortar o escopo** (ex: uma cidade ou bairro específico) para viabilizar em prazo curto.

## Stack técnica

- **Frontend/Fullstack:** Next.js (App Router)
- **Backend:** Node.js (via API routes do Next.js ou serviço separado, a definir conforme escala)
- **Banco de dados:** PostgreSQL
- **ORM:** Prisma (padrão a menos que haja motivo para outro)
- **Estilo:** Tailwind CSS
- **Deploy:** a definir (Vercel para frontend é o caminho natural com Next.js)

Ajuste esta seção conforme decisões forem tomadas — mantenha sempre atualizada, é a fonte de verdade da stack.

## Estrutura de dados (rascunho inicial)

```
Imovel
  - id
  - tipo (apartamento, casa, terreno...)
  - endereco / bairro / cidade
  - area_m2
  - quartos, banheiros, vagas
  - preco_anunciado
  - fonte (portal de origem)
  - criado_em

Transacao
  - id
  - imovel_ref (ou snapshot de características, caso não haja vínculo direto)
  - preco_efetivo
  - data_transacao
  - fonte (CIB, CREI, etc.)

IndiceMercado
  - regiao
  - tipo_imovel
  - preco_medio_m2
  - calculado_em
```

Este é um rascunho — evoluir junto com o time conforme os dados reais das fontes forem mapeados.

## Convenções de código

- Funções, não lógica solta — nada de blocos grandes de lógica direto em componentes/rotas; extrair para funções nomeadas e testáveis.
- Nomes de branch: `tipo/descricao-curta` (ex: `feature/indice-preco-justo`, `fix/scraping-zap`)
- Commits: mensagens curtas e no imperativo (ex: "adiciona cálculo de índice de desvio")
- Variáveis de ambiente: nunca commitar `.env`; manter `.env.example` atualizado

## Prioridades do MVP (hackathon / prazo curto)

1. Escolher UMA fonte de dados de transações + UM portal de ofertas para provar o conceito
2. Implementar o cálculo do índice de desvio para um recorte geográfico pequeno
3. Tela simples: usuário informa/busca um imóvel → sistema mostra "abaixo / dentro / acima do mercado" com os comparáveis usados
4. Validar com corretores reais se o índice bate com a percepção deles do mercado

## O que NÃO fazer neste estágio

- Não tentar cobrir todo o Brasil ou todos os tipos de imóvel de uma vez
- Não construir scraping de múltiplos portais antes de validar o cálculo do índice com uma fonte só
- Não polir UI antes de provar que o índice é útil/confiável
