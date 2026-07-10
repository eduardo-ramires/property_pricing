# Jetimob — Guia de Padrões de Layout

> Documento extraído via inspeção visual e de acessibilidade do sistema em produção (`app.jetimob.com`).
> Serve como referência de design para novas telas que devem seguir o padrão visual existente.

---

## 1. Estrutura Global da Página

O sistema usa um layout de **três colunas fixas** com conteúdo central rolável:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TOPBAR (navbar)                              │
├──────────┬──────────────────────────────────────────┬──────────────┤
│          │                                          │              │
│ SIDEBAR  │         ÁREA DE CONTEÚDO                │  PAINEL DE   │
│ ESQUERDA │         (conteúdo principal)             │  USUÁRIOS    │
│ ~155px   │         (flex: 1, rolável)               │  ~50px       │
│          │                                          │              │
└──────────┴──────────────────────────────────────────┴──────────────┘
```

- **Topbar**: fixa no topo, altura ~55px
- **Sidebar esquerda**: fixa, largura ~155px (pode colapsar para ~40px só com ícones)
- **Painel de usuários**: coluna estreita fixa à direita (~50px), avatares dos usuários online
- **Conteúdo**: área central ocupa o restante, fundo cinza claro, tem scroll

---

## 2. Topbar (Barra de Navegação Superior)

**Cor de fundo**: `#284670` (navy / azul escuro — `--primary-color`)
**Cor do texto**: `#ffffff`

### Estrutura interna (esquerda → direita):

```
[ ☰ ]  [ Logo jetimob ★ ]  [ 🔍 ]  ....  [ Base de Teste 01 ]  [ ⊞ ]  [ 🔔 ]  [ ER ▾ ]
```

| Elemento | Descrição |
|---|---|
| `☰` | Botão hamburguer — colapsa/expande a sidebar |
| Logo jetimob | SVG/imagem, link para `/dashboard` |
| `🔍` | Ícone de busca global |
| Nome da base | Texto clicável (link externo da empresa) |
| `⊞` | Grid/apps icon (acesso rápido a outras bases ou produtos) |
| `🔔` | Sino de notificações — badge contador se houver novas |
| Avatar `ER` | Círculo com iniciais do usuário logado, cor variada por usuário |
| `Eduardo Ra... ▾` | Nome do usuário com dropdown de conta |

### Dropdown do usuário:
- Configurações da conta → `/configuracoes-da-conta`
- Configurações de notificações → `/configuracoes-de-notificacoes`
- E-mail empresarial → externo
- Meu plano → `/meu-plano`
- Acesso remoto → `/acesso-remoto`
- Alternar sistema
- Sair
- Links: Política de privacidade | Termos de uso

---

## 3. Sidebar Esquerda

**Cor de fundo**: `#ffffff` (branco)
**Largura expandida**: ~155px
**Largura colapsada**: ~40px (apenas ícones)
**Borda direita**: sutil, cinza claro

### Itens de navegação (ordem de cima para baixo):

| Ícone | Label | URL | Notas |
|---|---|---|---|
| `⊞` | Início | `/dashboard` | Dashboard |
| 🏠 | Imóveis | `/imoveis` | |
| 🏢 | Condomínios | `/condominios` | |
| 🔑 | Chaves | `/chaves` | |
| 📋 | Propostas | `/propostas` | |
| 👥 | Leads | `/leads` | Badge numérico vermelho (ex: `1112`) |
| 🎯 | Roletas de leads | `/roletas-de-leads` | Badge `!` quando há pendências |
| 👤 | Pessoas | `/pessoas` | |
| 🎯 | Oportunidades | `/oportunidades` | |
| ✅ | Atividades | `/atividades` | |
| 🌐 | Portais | `/portais` | |
| 🏠 | Aluguéis | — | Expansível (submenu) |
| 💰 | Vendas | `/vendas` | |
| 📊 | Relatórios | `/relatorios` | |
| 🔗 | Integrações | `/integracoes` | |
| 🌐 | Meu site | `/gerenciar-site/conheca-o-cms` | |
| ⚙️ | Sistema | — | Expansível (submenu) |

**Rodapé da sidebar**: link "Dicas e apoio" (fixo no bottom)

### Submenu "Aluguéis" (expandível — seta para baixo/cima):
- Contratos → `/locacao/contratos`
- Faturas → `/locacao/faturas`
- Repasses → `/locacao/repasses`
- Análises
- Régua de cobrança

### Estado ativo:
- Item ativo: texto e ícone em azul (`#284670`), possível destaque de fundo
- Itens inativos: cinza escuro / texto neutro

---

## 4. Painel de Usuários Online (coluna direita)

Coluna estreita (~50px) com fundo claro, posicionada à direita do conteúdo.

- Lista vertical de **avatares circulares** com foto dos usuários logados
- Hover mostra nome completo em tooltip
- **Rodapé**: botão para expandir o chat interno + ícone de som (ativar/desativar notificações sonoras)
- Comportamento: ao abrir formulário de cadastro, os avatares são substituídos por **ícones de ação rápida** específicos da entidade (ver seção 9)

---

## 5. Área de Conteúdo Principal

**Cor de fundo**: cinza claro (`#f3f4f6` aproximado)
**Padding**: ~20–24px nas laterais e topo

### Estrutura padrão de uma tela:

```
[ Breadcrumb ]
[ Barra de Ações ]
────────────────────────────────
[ Painel de Filtros ]
[ Seção de Listagem / Conteúdo ]
```

---

## 6. Breadcrumb

Sempre na parte superior do conteúdo, antes de qualquer ação.

**Formato**: `INÍCIO > MÓDULO > SUBMÓDULO`

- Todo em maiúsculas
- Separador: `›` ou `>`
- "INÍCIO" e intermediários são links clicáveis (cor azul ou cinza)
- Página atual em destaque (negrito ou cor diferente)

**Exemplos reais**:
- `INÍCIO > IMÓVEIS`
- `INÍCIO > PESSOAS > NOVA`
- `INÍCIO > IMÓVEIS > 30712460884 > EDITAR`
- `INÍCIO > CONTRATOS`

---

## 7. Barra de Ações (Action Bar)

Logo abaixo do breadcrumb. Contém botões de ação primários e secundários.

### Botão primário (CTA principal):
```
[ + Novo X ]
```
- Classe: `.jet-button.primary` (ou similar)
- Fundo: `#284670` | Texto: `#ffffff`
- Prefixo `+` para criação
- Border-radius: arredondado (~4–6px)

### Botões secundários:
- Fundo branco, borda azul ou cinza, texto azul/escuro
- Com ícone à esquerda (Font Awesome)
- Exemplos: `📋 Padrão de contrato`, `🔄 Reajustes`, `📄 DIMOB`, `🛡️ Seguros`, `⚙️ Configurações`

---

## 8. Painel de Filtros

Card branco com cabeçalho "Filtros" (com ícone de funil).

**Canto superior direito**: link `💾 Salvar filtro`

### Tipos de campo de filtro:
| Tipo | Elemento |
|---|---|
| Busca textual | `<input type="text">` com placeholder descritivo |
| Seleção única | Dropdown (v-select) |
| Multi-seleção | Dropdown multiselect (vue-multiselect) |
| Período/Data | Date picker (Flatpickr) |
| Checkboxes inline | Para tipos (ex: Venda, Locação, Temporada) |
| Toggle de tipo | Botões pill (ex: Ligar, Email, Reunião, Tarefa...) |

**Botão "Mais filtros"**: expande campos adicionais com ícone `▼`

**Rodapé do painel** (algumas telas): botões `Limpar` (outline) e `Filtrar` (primary)

### Tags de filtro ativo:
Exibidas entre o painel e a listagem:
```
[ Funil: Funil de Venda ✕ ]  [ Status: Abertas ✕ ]       [ Limpar filtros ]
```

---

## 9. Padrões de Tela (Views)

### 9.1 Tela de Listagem com Filtro Lateral (ex: Imóveis)

Layout **duas colunas**:
- **Esquerda (~35%)**: painel de filtros com campos empilhados verticalmente
- **Direita (~65%)**: área de resultados

**Cabeçalho da área de resultados**:
```
[ 🏠 Imóveis (9793) ]                              [ ⊞ ][ 🗺️ ]
```
- Título com ícone + contagem total entre parênteses
- Toggle de visualização: lista (`⊞`) | mapa (`🗺️`)

**Barra de seleção em massa**:
```
[ ☐ Selecionar ]  [ Ações ▾ ]                    [ Data de atualização ▾ ]
```

**Card de imóvel na lista**:
```
┌────────────────────────────────────────────────────────────────┐
│ ☐  [Foto 180x120]  Endereço, número           🛏️ 3 (1)   [DWV]  Venda   R$ 1.900.000  › │
│                    Tipo (ex: Apartamento)      🚿 1              │
│                    Bairro                      🚗 3              │
│                    Cidade - UF                 📐 240.35 m²      │
│                    Condomínio (link azul)       📐 119.53 m²      │
│  [  Mídias  ] [ ↻ Atualizar ] [ ℹ Info ]                        │
└────────────────────────────────────────────────────────────────┘
```

---

### 9.2 Tela de Listagem em Tabela (ex: Leads, Pessoas, Contratos)

Layout **full-width** com painel de filtros acima da tabela.

**Cabeçalho da seção**:
```
[ 👥 Leads (1846) ❓ ]
```

**Barra de controle**:
```
[ ☐ Selecionar (0) ]  [ Ações ▾ ]              [ Ordem alfabética ▾ ]
```

**Tabela**:
- Cabeçalhos de coluna: texto simples, sem estilo especial
- Linha: checkbox | dados das colunas | `›` (chevron right para detalhe)
- Nome clicável em azul
- Dados secundários (email, telefone) em cinza abaixo do nome principal
- Avatares circulares de usuário responsável na coluna "Responsável"
- Badges de status coloridos (pill)

**Colunas comuns por módulo**:

| Módulo | Colunas |
|---|---|
| Leads | Nome (+ email + telefone), Data, Origem, Imóvel referência, Responsável, Oportunidade, Status |
| Pessoas | Nome, Telefones, E-mail, Data Nasc., Gênero, Tipo, Imóveis |
| Contratos | Código, Imóvel, Locador, Locatário, Reajuste, Status |

---

### 9.3 Kanban (ex: Oportunidades)

Visualização padrão de oportunidades por funil.

**Cabeçalho da seção**:
```
[ 🎯 Oportunidades (198)  R$ 3.800.008 ]           [ ⊞ ][ ≡ ]
```
- Toggle: Kanban (`⊞`) | Tabela (`≡`)

**Colunas do Kanban**:
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Captação        │  │ Fechamento      │  │ Negociação      │
│ 156 Negociações │  │ 1 Negociação    │  │ 9 Negociações   │
│ R$ 3.800.008    │  │ R$ 0,0          │  │ R$ 0,0          │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ...             │
│ │ Ana Paula   │ │  │ │ PessoaA     │ │  │                 │
│ │ (11) 9...   │ │  │ │ (51) 9...   │ │  │                 │
│ │ email@...   │ │  │ │ email@...   │ │  │                 │
│ │ Valor n/i   │ │  │ │ Valor n/i   │ │  │                 │
│ │ ⏱53d ❌1d  │ │  │ │ ⏱218d ❌168d│ │  │                 │
│ │ [Avatar] [📅 Sem atividade!] [+] │ │  │                 │
│ └─────────────┘ │  └─────────────────┘  └─────────────────┘
```

**Card de oportunidade**:
- Nome (bold, azul clicável)
- Telefone (link, azul)
- Email
- Valor (cinza se não informado)
- Contadores de tempo: ⏱ (tempo desde criação) | ❌ (tempo sem atividade) — vermelho quando atrasado
- Avatar do responsável
- Badge de atividade: `📅 Sem atividade!` (amarelo) ou `📍 Há 8 meses` (vermelho)
- Botão `+` para adicionar atividade

---

### 9.4 Calendário Semanal (ex: Atividades)

**Cabeçalho**:
```
[ ← ]  06 jul - 13 jul 2026  [ → ]        [ Voltar para hoje ]
```

**Grade**:
```
         seg 6   ter 7   qua 8   qui 9   sex 10  sáb 11  dom 12
Dia todo │       │       │       │       │       │       │
─────────┼───────┼───────┼───────┼───────┼───────┼───────┼───────
17:00    │       │       │       │       │       │       │
─────────┤       │       │       │       │       │       │
18:00 🔴─┼───────┼───────┼───────┼───────┼───────┼───────┤
         │       │       │       │       │       │       │
19:00    │       │       │       │       │       │       │
```

- Linha vermelha horizontal = horário atual
- Toggle no canto: Calendário (`📅`) | Lista (`≡`)

**Filtros de tipo de atividade** (botões pill com ícone):
```
[ 📞 Ligar ] [ ✉️ Email ] [ 👥 Reunião ] [ ✅ Tarefa ] [ 💬 Mensagem ] [ 📍 Visita ]
```

---

### 9.5 Lista Simples com Chevron (ex: Relatórios, Exclusividades)

Itens em lista vertical, cada um:
```
[ Texto do item / link azul ]                                    ›
```
- Fundo branco
- Sem colunas — apenas texto + chevron à direita
- Hover com destaque sutil

---

## 10. Formulários (Cadastro / Edição)

### Estrutura Multi-Step

Formulários são divididos em etapas (steps) empilhadas verticalmente na mesma página:

```
┌─────────────────────────────── Step 1 (ativo) ────────────────────────────────┐
│ [ ícone ] Título da Seção                                                      │
│                                                                                │
│  Campo 1 *        Campo 2               Campo 3                                │
│  [___________]    [___________]         [___________]                          │
│                                                                                │
│                                              [ Voltar ]  [ Próximo ▶ ]        │
└────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────── Step 2 (inativo) ──────────────────────────────┐
│ [ ícone ] Título da Seção 2                                                    │
│ [campos desabilitados, cinza, baixa opacidade]                                 │
│                                              [ Voltar ]  [ Próximo ▶ ]        │
└────────────────────────────────────────────────────────────────────────────────┘
```

- Step ativo: **fundo branco, opacidade 100%**, campos interativos
- Steps inativos: **fundo cinza** (`~#e5e7eb`), campos desabilitados, baixa opacidade
- IDs: `#step-0`, `#step-1`, `#step-2`...
- Botão avançar: `#step-N-next-button`
- Último step: botão "Salvar" (primary)

### Grid de campos:
- Geralmente **2 ou 3 colunas** em telas grandes
- Campo ocupa toda a largura do container em mobile
- Label acima do input, sempre
- `*` vermelho para campos obrigatórios

### Tipos de input usados:

| Tipo | Elemento / Componente | Exemplo |
|---|---|---|
| Texto | `<input type="text">` | Nome, e-mail |
| Número | `<input type="number">` (`spinbutton`) | Preço, área |
| Telefone | Input com bandeira + `+55 ▾` | `(11) 96123-4567` |
| Data | Flatpickr | `dd/mm/aaaa` |
| Dropdown simples | v-select (`<div class="v-select">`) | Estado civil, tipo |
| Multiselect | vue-multiselect (`.multiselect__tags`) | Etiquetas |
| Radio | `<input type="radio">` horizontal | Gênero, disponibilidade |
| Checkbox | `<input type="checkbox">` | Finalidade (Venda/Locação/Temporada) |
| Rich text | Quill editor (`#quill-container`) | Descrição/bio profissional |
| Máscara CPF | `999.999.999-99` | CPF |
| Máscara CNPJ | `99.999.999/9999-99` | CNPJ |
| Máscara CEP | `99999-999` | CEP |
| Upload de foto | Área clicável + "Remover" | Avatar de perfil |

### Painel de Ações Rápidas (lado direito em formulários)

Quando em tela de cadastro/edição, o painel de usuários online é substituído por uma coluna vertical de **ícones de ação rápida** circulares:

**Pessoa** (~5 ícones): adicionar pessoa, localização, telefone, câmera, chave

**Imóvel** (~12+ ícones): documento, localização, visualizar, info, chave, nuvem, reproduzir, clipboard, lixeira, lista, megafone...

---

## 11. Componentes Reutilizáveis

### 11.1 Badges / Pills de Status

Pequenas pílulas com texto e cor de fundo:

| Status | Cor de fundo | Cor do texto | Exemplo |
|---|---|---|---|
| Ativo | Verde (`~#22c55e`) | Branco | `Ativo` |
| Em aprovação | Azul | Branco | `1784 Em aprovação` |
| Expirando | Laranja (`~#f97316`) | Branco | `0 Expirando` |
| Desatualizado | Vermelho (`~#ef4444`) | Branco | `2019 Desatualizados` |
| Qualificado por IA | Verde claro / destaque | — | `✨ Qualificado por IA` |
| Sem atividade | Amarelo | Texto escuro | `📅 Sem atividade!` |

### 11.2 Cards do Dashboard

```
┌────────────────────────────────────────────────────┐
│ [ ícone ] Título                Vendo todos  [ ⋮ ] │
├────────────────────────────────────────────────────┤
│                                                    │
│         [conteúdo variado: gráfico, stats, lista]  │
│                                                    │
└────────────────────────────────────────────────────┘
```

- Fundo branco, bordas arredondadas, sombra sutil
- Cabeçalho (`<header>`) com ícone + título + "Vendo todos" link + menu `⋮` (três pontos)
- Conteúdo varia: gráfico donut, números grandes, lista com indicadores coloridos

**Cards de estatística** (ex: Aluguéis):
```
Pendências
   32               0                  140
Faturas atrasadas   Boletos expiram     Repasses pendentes
                    em até 7 dias
─────────────────────────────────────────────────────
Contratos
    2               0                   10
Em aviso prévio   Garantias locatícias  Para reajustar
                  vencendo              neste mês
```

**Cards de lista colorida** (ex: Exclusividades, Chaves):
```
│ verde │ 0 atualizadas          ›
│ amber │ 0 vencendo             ›
│ rojo  │ 12 vencidas            ›
```
Borda colorida à esquerda indicando criticidade.

### 11.3 Banners de Aviso

**Informativo** (azul claro):
```
┌───────────────────────────────────────────────────────────┐
│ ℹ️  Os campos bloqueados do endereço podem ser editados   │
│     no condomínio.                                        │
└───────────────────────────────────────────────────────────┘
```

**Alerta** (amarelo/âmbar):
```
┌───────────────────────────────────────────────────────────┐
│ ⚠️  Existem contratos que não possuem categorias de       │
│     lançamento configuradas... [link]                     │
└───────────────────────────────────────────────────────────┘
```

**Anúncio** (borda azul, fundo branco/levemente azulado):
```
┌───────────────────────────────────────────────────────────┐
│ 📢 Aviso importante                                       │
│ Informamos que nosso atendimento está indisponível...     │
└───────────────────────────────────────────────────────────┘
```

### 11.4 Dropdown de Ações por Linha (tabela)

Ativado ao hover no ícone `⋮` (`fa-ellipsis-vertical`) à direita de uma linha:

```
┌──────────────┐
│  ✏️ Editar   │
│  🗑️ Excluir  │
└──────────────┘
```
- Classe: `.table-list-dropdown`
- Aparece no hover, desaparece ao sair

### 11.5 Modal (Jet Modal)

```
┌────────────────────────────────────────┐
│  Título do modal                    ✕  │
├────────────────────────────────────────┤
│                                        │
│  Conteúdo / formulário / confirmação   │
│                                        │
├────────────────────────────────────────┤
│              [ Cancelar ] [ Salvar ]   │
└────────────────────────────────────────┘
```
- Classe: `.jet-modal`
- Overlay escuro por baixo
- Botão Salvar: `.jet-button.primary` (azul)
- Botão Cancelar: outline ou ghost

### 11.6 Jet Prompt (Confirmação Destrutiva)

Para exclusões que exigem confirmação do usuário:

**Variante 1 — digitar "excluir"**:
```
[ input: "excluir" ]          [ Excluir (vermelho) ]
```

**Variante 2 — digitar código do registro**:
```
Código do imóvel: 30712460884
[ input: _______________ ]    [ Excluir (vermelho) ]
```
- Classe: `.jet-prompt`
- Botão delete: `.jet-button.red`

### 11.7 Toast de Feedback

Aparecem no canto da tela após ações:
- **Sucesso**: fundo verde, texto branco — ex: `"A roleta foi excluída."`
- **Erro**: fundo vermelho, texto branco
- Classe: via `Toast.ts` page object

---

## 12. Identidade Visual e Cores

### Paleta Principal

| Nome | Valor HEX | RGB | Uso |
|---|---|---|---|
| Primary (Navy) | `#284670` | `rgb(40, 70, 112)` | Topbar, botões primários, links ativos |
| Branco | `#ffffff` | — | Cards, sidebar, inputs |
| Background | `~#f3f4f6` | — | Fundo das páginas |
| Borda/Divider | `~#e5e7eb` | — | Bordas de cards e separadores |
| Texto primário | `~#111827` | — | Títulos e texto principal |
| Texto secundário | `~#6b7280` | — | Labels, placeholders, texto muted |

### Paleta de Status

| Nome | HEX | Uso |
|---|---|---|
| Sucesso / Verde | `~#22c55e` | Status "Ativo", toasts de sucesso |
| Alerta / Laranja | `~#f97316` | "Expirando", itens atenção |
| Perigo / Vermelho | `~#ef4444` | "Desatualizado", erro, deletar |
| Aviso / Amarelo | `~#eab308` | "Sem atividade!", banners de alerta |
| Info / Azul claro | `~#3b82f6` | Links, badges de aprovação |

---

## 13. Tipografia

- **Família**: Sans-serif moderna (aparenta ser Inter ou similar)
- **Títulos de página/seção**: negrito, ~16–20px, cor escura
- **Labels de formulário**: ~13–14px, cor escura, `font-weight: 500`
- **Texto de tabela**: ~14px, cor primária
- **Texto muted/secundário**: ~13px, cinza (`#6b7280`)
- **Links**: cor `#284670` ou azul, sem sublinhado padrão (sublinhado no hover)
- **Badges**: ~11–12px, negrito, uppercase em alguns casos

---

## 14. Ícones

O sistema usa **Font Awesome** (versão 6+). Classes CSS relevantes:

| Classe FA | Uso no sistema |
|---|---|
| `fa-chevron-right` | Seta de navegar para detalhe nas linhas de tabela |
| `fa-ellipsis-vertical` | Menu de ações da linha (⋮) |
| `fa-trash-can` | Remover item de uma lista |
| `fa-filter` | Ícone do painel de Filtros |
| `fa-floppy-disk` | Salvar filtro |
| `fa-bell` | Notificações (topbar) |
| `fa-magnifying-glass` | Busca |
| `fa-bars` | Hamburguer (colapsar sidebar) |
| `fa-plus` | Botões de criar novo |
| `fa-gear` | Configurações |
| `fa-house` | Imóveis / Início |
| `fa-key` | Chaves |
| `fa-person` | Pessoas |
| `fa-rotate` | Atualizar |
| `fa-circle-info` | Info |
| `fa-images` | Mídias |

---

## 15. Seletores CSS Recorrentes

| Seletor | O que é |
|---|---|
| `.module-link` | Link do menu lateral |
| `.jet-button` | Botão padrão do sistema |
| `.jet-button.primary` | Botão primário (azul `#284670`) |
| `.jet-button.red` | Botão destrutivo (vermelho) |
| `.jet-modal` | Modal padrão |
| `.jet-prompt` | Prompt de confirmação com input |
| `.overlay` | Overlay de carregamento (tela de espera) |
| `.table-list-dropdown` | Dropdown de ações por linha |
| `.fa-ellipsis-vertical` | Ícone de três pontos (abre dropdown) |
| `.fa-trash-can` | Ícone lixeira |
| `.fa-chevron-right` | Chevron de navegação para detalhe |
| `.multiselect__tags` | Container do multiselect |
| `.flatpickr-day` | Dia no date picker |
| `.flatpickr-day.today` | Dia atual no date picker |
| `#step-N` | Container do step N no formulário multi-step |
| `#step-N-next-button` | Botão "Próximo" do step N |
| `#quill-container` | Editor de rich text |
| `.prompt_code` | Span com código a ser digitado no prompt |
| `input[placeholder="excluir"]` | Input de confirmação de exclusão |

---

## 16. Padrões de URL

| Padrão | Tipo de tela |
|---|---|
| `/modulo` | Listagem (ex: `/leads`, `/imoveis`, `/pessoas`) |
| `/modulo/novo` | Formulário de criação (ex: `/pessoas/novo`) |
| `/modulo/:id/editar` | Formulário de edição (ex: `/imoveis/30712460884/editar`) |
| `/modulo/:id` | Tela de detalhe (ex: `/oportunidades/123`) |
| `/modulo-pai/sub-modulo` | Submódulo (ex: `/locacao/contratos`, `/locacao/faturas`) |
| `/gerenciar-site/*` | Área do CMS / site |
| `?page=N` | Paginação |
| `?status=X&order=Y` | Filtros e ordenação via query string |
| `?disponibilidade=N&origem=-1` | Filtros específicos (imóveis) |

---

## 17. Comportamentos e UX Patterns

### Navegação
- Clicar no módulo na sidebar: carrega a listagem
- Linha de tabela: clicar no nome (link) ou no `›` abre o detalhe
- Breadcrumb: links ativos permitem voltar para listagem

### Loading / Overlay
- `.overlay` aparece sobre o conteúdo durante carregamentos longos
- Desaparece automaticamente ao concluir

### Seleção em massa
- Checkbox "Selecionar" no topo da lista marca/desmarca todos visíveis
- Dropdown "Ações" (ou "Selecionar") ativa ações em lote: Excluir, etc.

### Paginação
- Via query string `?page=N`
- Controles no rodapé da listagem (não capturados na exploração, mas padrão)

### Busca com Enter
```javascript
await page.fill('input[placeholder="Busque..."]', termo);
await page.keyboard.press('Enter');
await page.waitForTimeout(1000); // aguardar lista atualizar
```

### Timeouts recomendados para automação
| Cenário | Timeout |
|---|---|
| Elementos rápidos (dropdown, overlay) | 5000ms |
| Validações padrão | 10000ms |
| Operações lentas (save, delete) | 15000ms |
| Listas grandes com filtros pesados | 40000ms |

---

## 18. Telas Exploradas (Referência)

| Tela | URL | Tipo de Layout |
|---|---|---|
| Dashboard | `/dashboard` | Cards em grid 3 colunas |
| Login | `/` | Split: hero esquerda + form direita |
| Imóveis | `/imoveis` | Filtro lateral + lista de cards |
| Cadastro de pessoa | `/pessoas/novo` | Formulário multi-step |
| Edição de imóvel | `/imoveis/:id/editar` | Formulário multi-step (muitos steps) |
| Leads | `/leads` | Filtros acima + tabela |
| Pessoas | `/pessoas` | Filtros acima + tabela |
| Oportunidades | `/oportunidades` | Filtros acima + Kanban / Tabela |
| Atividades | `/atividades` | Filtros com pills + Calendário semanal / Lista |
| Contratos | `/locacao/contratos` | Filtros acima + tabela |
| Relatórios | `/relatorios` | Lista simples de links com chevron |
| Configurações da conta | `/configuracoes-da-conta` | Formulário multi-step com avatar |