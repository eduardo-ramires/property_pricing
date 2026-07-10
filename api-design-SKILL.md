---
name: api-design
description: Padrões de arquitetura de API e backend para este projeto de precificação de imóveis (Next.js API routes / Route Handlers + PostgreSQL + Prisma). Use sempre que for criar, alterar ou revisar rotas de API, endpoints, integrações com fontes de dados externas (CIB, CREI, portais imobiliários), lógica de cálculo do índice de preço, ou schema do banco de dados.
---

# API Design — PrecificaJusta

## Princípio geral

O núcleo do produto é o **cálculo do índice de desvio de preço**. Toda decisão de API deve proteger a integridade e a transparência desse cálculo — o usuário precisa poder confiar no número, então o backend precisa ser capaz de explicar de onde ele veio (quais comparáveis foram usados, de qual fonte, de qual data).

## Estrutura de rotas (Next.js App Router)

Usar Route Handlers em `app/api/`, organizados por recurso:

```
app/api/
  imoveis/
    route.ts          -> GET (listar/buscar), POST (criar)
    [id]/route.ts      -> GET, PATCH, DELETE de um imóvel
  indice/
    route.ts          -> POST { imovel } -> calcula e retorna índice de desvio
  transacoes/
    route.ts          -> GET (listar transações usadas como base)
  fontes/
    [fonte]/sync/route.ts -> endpoints de sincronização com fontes externas (CIB, CREI, portais)
```

## Regras de implementação

- **Separar lógica de cálculo da rota.** A lógica do índice de desvio (`indiceMercado`, `precoJusto`, etc.) deve viver em `lib/pricing/` como funções puras e testáveis — nunca inline dentro do Route Handler. Isso é crítico: essa é a parte mais importante do produto e precisa ser fácil de testar isoladamente.
- **Toda resposta do cálculo do índice deve incluir os comparáveis usados**, não só o número final. Formato sugerido:
  ```ts
  {
    indice: 0.12, // 12% acima do mercado
    classificacao: "acima" | "dentro" | "abaixo",
    precoJustoEstimado: number,
    comparaveis: [{ id, endereco, precoEfetivo, dataTransacao, fonte }],
    calculadoEm: string
  }
  ```
- **Validação de entrada:** usar Zod em todas as rotas que recebem body/query. Nunca confiar em dado bruto do cliente, especialmente para os campos que alimentam o cálculo de preço.
- **Fontes externas (scraping/API de portais):** isolar cada integração em `lib/fontes/{nome-da-fonte}.ts` com uma interface comum (ex: `buscarOfertas(regiao): Promise<Oferta[]>`), para poder trocar/adicionar fontes sem reescrever o resto do sistema.
- **Rate limiting e cache:** dados de portais mudam devagar — cachear respostas de fontes externas (Redis, se disponível, ou cache simples em banco) para não fazer scraping/chamadas repetidas a cada request.
- **Erros:** sempre retornar erros estruturados (`{ error: { code, message } }`), nunca stack trace cru pro cliente.

## Banco de dados (Prisma + PostgreSQL)

- Schema fica em `prisma/schema.prisma`, como fonte única de verdade — refletir aqui qualquer mudança de modelo (ver rascunho inicial no CLAUDE.md do projeto).
- Toda tabela que guarda preço deve guardar também a **data de referência** e a **fonte** — nunca só o valor. Preço sem contexto temporal e de origem é inútil pro objetivo do produto.
- Migrations: usar `prisma migrate dev` em desenvolvimento; nunca editar o banco manualmente.

## Segurança

- Nunca expor chaves de API de fontes externas no client — tudo que toca fonte externa fica em Server Components/Route Handlers.
- Sanitizar qualquer dado vindo de scraping antes de persistir (portais podem ter HTML malformado ou dados inconsistentes).

## O que evitar

- Não misturar lógica de cálculo do índice com lógica de apresentação/formatação — cálculo puro primeiro, formatação (R$, %, etc.) só na camada de exibição.
- Não fazer scraping em tempo real na rota chamada pelo usuário — isso deve ser um job/sync separado que popula o banco, e a rota do usuário só consulta o banco.
- Não criar endpoint genérico "faz tudo" — cada rota deve ter uma responsabilidade clara.
