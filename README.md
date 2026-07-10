# PrecificaJusta

Índice de aderência ao mercado imobiliário: cruza transações reais com ofertas ativas para apontar se um imóvel está abaixo, dentro ou acima do preço de mercado. Contexto completo do produto em [CLAUDE.md](./CLAUDE.md).

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS · shadcn/ui · Prisma · PostgreSQL · Redis · Zod

## Primeira vez rodando o projeto

### Com Docker (recomendado)

Pré-requisito: Docker e Docker Compose instalados.

```bash
cp .env.example .env
docker compose up --build
```

Isso builda a imagem, sobe o app (com hot-reload), o Postgres e o Redis. Depois de subir, num outro terminal:

```bash
docker compose exec app npx prisma generate   # gera o Prisma Client dentro do container
docker compose exec app npm run db:migrate    # aplica as migrations
```

App em http://localhost:3000, health check em http://localhost:3000/api/health (deve responder `{"status":"ok",...}`).

> Se em algum momento o app reclamar de `@prisma/client did not initialize yet` mesmo após gerar o client, o volume anônimo de `node_modules` pode ter ficado com um estado antigo. Resolva com:
> ```bash
> docker compose down -v
> docker compose up --build
> ```
> O `-v` remove os volumes (inclusive dados do Postgres/Redis) — ok em ambiente de desenvolvimento, evite se já houver dados importantes.

### Sem Docker

Pré-requisitos: Node 22+, uma instância local do PostgreSQL e uma do Redis.

```bash
cp .env.example .env   # ajuste DATABASE_URL e REDIS_URL para seus serviços locais
npm install             # o postinstall já roda "prisma generate"
npm run db:migrate
npm run dev
```

## Rodando no dia a dia

Depois do setup inicial, para subir o ambiente novamente:

```bash
docker compose up          # com Docker
# ou
npm run dev                # sem Docker
```

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Roda o Next.js em modo desenvolvimento |
| `npm run build` / `npm run start` | Build e start em modo produção |
| `npm run lint` | Roda o ESLint |
| `npm run format` | Formata o projeto com Prettier |
| `npm run db:migrate` | Aplica migrations do Prisma (`prisma migrate dev`) |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm run db:generate` | Gera o Prisma Client |
| `npm run docker:up` / `npm run docker:down` | Atalhos para o docker-compose |

## Estrutura de pastas

```
app/
  (public)/     # rotas públicas (páginas)
  api/          # route handlers (ex: /api/health)
  layout.tsx
components/
  ui/           # componentes shadcn/ui
lib/
  db/           # cliente Prisma (singleton)
  pricing/      # cálculo do índice de desvio (a implementar)
  fontes/       # integrações com fontes externas: CIB, CREI, portais (a implementar)
  validators/   # schemas de validação com Zod (a implementar)
prisma/
  schema.prisma # datasource + generator (models ainda não definidos)
dataset/        # dados brutos de ITBI usados na exploração inicial
```
