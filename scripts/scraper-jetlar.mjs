/**
 * scraper-jetlar.mjs
 *
 * Coleta imóveis à venda (jetlar.com/venda) e para alugar (jetlar.com/alugar)
 * e exporta para dataset/jetlar-imoveis.csv, para uso como dataset de
 * ofertas ativas na precificação (ver CLAUDE.md).
 *
 * IMPORTANTE:
 * - https://www.jetlar.com/robots.txt permite crawling de /venda e /alugar
 *   (só bloqueia áreas de conta/checkout/admin). Ainda assim, revise os
 *   Termos de Uso do site antes de rodar em escala grande.
 * - As páginas de listagem são renderizadas via SSR (Next.js) e embutem o
 *   resultado da API interna da própria Jetlar (hidratação do react-query)
 *   direto no HTML. Em vez de depender de seletores CSS (frágeis e sujeitos
 *   a mudanças de estilo), extraímos esse JSON já estruturado do HTML —
 *   não é necessário navegador/Playwright para isso.
 * - Os resultados não vêm ordenados por cidade: é preciso paginar até achar
 *   os imóveis da cidade-alvo (ver CIDADE_ALVO abaixo). Ajuste
 *   JETLAR_MAX_ITENS / JETLAR_MAX_PAGINAS conforme o tamanho de amostra que
 *   você precisa — coletar uma cidade inteira pode levar muitas páginas.
 *
 * Uso:
 *   node scripts/scraper-jetlar.mjs
 *   JETLAR_CIDADE="Porto Alegre" JETLAR_MAX_ITENS=500 node scripts/scraper-jetlar.mjs
 */

import { appendFile, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const BASE_URL = "https://www.jetlar.com";
const USER_AGENT = "Mozilla/5.0 (compatible; PrecificaJustaBot/1.0; +mailto:seu-email@exemplo.com)";

// Recorte geográfico do MVP (ver CLAUDE.md — "não tentar cobrir todo o Brasil de uma vez").
// Deixe "" para não filtrar por cidade (não recomendado: o catálogo é nacional).
const CIDADE_ALVO = process.env.JETLAR_CIDADE ?? "Porto Alegre";

// Trava de segurança de páginas percorridas (cada página tem poucos itens e
// a maioria não é da cidade-alvo, então isso pode ser bem maior que MAX_ITENS).
const MAX_PAGINAS = Number(process.env.JETLAR_MAX_PAGINAS ?? 4000);

// Para de coletar por tipo de transação assim que atingir esse total de
// imóveis da cidade-alvo (evita rodar horas sem necessidade).
const MAX_ITENS_POR_TRANSACAO = Number(process.env.JETLAR_MAX_ITENS ?? 300);

const DELAY_MS = Number(process.env.JETLAR_DELAY_MS ?? 1500);
const MAX_TENTATIVAS_POR_PAGINA = 3;

const OUTPUT_PATH = "dataset/jetlar-imoveis.csv";

const TRANSACOES = [
  { transacao: "venda", path: "venda" },
  { transacao: "aluguel", path: "alugar" },
];

const CSV_COLUNAS = [
  "fonte",
  "transacao",
  "id",
  "tipo",
  "titulo",
  "cidade",
  "bairro",
  "estado",
  "cep",
  "endereco",
  "latitude",
  "longitude",
  "quartos",
  "suites",
  "banheiros",
  "vagas",
  "mobiliado",
  "area_total_m2",
  "area_util_m2",
  "area_privativa_m2",
  "preco",
  "preco_total",
  "exclusividade",
  "url",
  "coletado_em",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function buscarPagina(path, pagina) {
  const url = `${BASE_URL}/${path}?pagina=${pagina}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} em ${url}`);
  }
  return res.text();
}

/**
 * O payload de listagem vem embutido no HTML dentro de um script
 * `self.__next_f.push(...)` (RSC flight data), como uma string JSON escapada
 * com um nível de barra invertida. Os marcadores abaixo foram confirmados
 * inspecionando o HTML real de /venda e /alugar.
 */
function extrairItens(html) {
  const marcadorInicio = '\\"items\\":[';
  const inicio = html.indexOf(marcadorInicio);
  if (inicio === -1) return { items: [], totalItems: null };

  const inicioArray = inicio + '\\"items\\":'.length;
  const marcadorFim = '}]},\\"nextCursor\\"';
  const fim = html.indexOf(marcadorFim, inicioArray);
  if (fim === -1) return { items: [], totalItems: null };

  const bruto = html.slice(inicioArray, fim + 2).replace(/\\"/g, '"');
  const items = JSON.parse(bruto);

  const totalMatch = html.match(/\\"totalItems\\":(\d+)/);
  const totalItems = totalMatch ? Number(totalMatch[1]) : null;

  return { items, totalItems };
}

function paraReais(valorEmCentavos) {
  return typeof valorEmCentavos === "number" ? valorEmCentavos / 100 : "";
}

function mapearImovel(item, transacao) {
  const contrato = item.contracts?.[0] ?? {};
  return {
    fonte: "jetlar",
    transacao,
    id: item.id,
    tipo: item.type ?? "",
    titulo: item.title ?? "",
    cidade: item.address?.city ?? "",
    bairro: item.address?.neighborhood ?? "",
    estado: item.address?.state ?? "",
    cep: item.address?.zipCode ?? "",
    endereco: item.address?.street ?? "",
    latitude: item.address?.coordinate?.latitude ?? "",
    longitude: item.address?.coordinate?.longitude ?? "",
    quartos: item.bedrooms ?? "",
    suites: item.suites ?? "",
    banheiros: item.bathrooms ?? "",
    vagas: item.garage ?? "",
    mobiliado: item.furnished ?? "",
    area_total_m2: item.totalArea?.value ?? "",
    area_util_m2: item.usefulArea?.value ?? "",
    area_privativa_m2: item.privateArea?.value ?? "",
    preco: paraReais(contrato.price?.value),
    preco_total: paraReais(contrato.totalPrice?.value),
    exclusividade: item.exclusivity ?? "",
    url: item.url ? `${BASE_URL}${item.url}` : "",
    coletado_em: new Date().toISOString(),
  };
}

function paraCsv(valor) {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  return /[",;\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function linhaCsv(imovel) {
  return CSV_COLUNAS.map((coluna) => paraCsv(imovel[coluna])).join(";");
}

async function coletarTransacao(transacao, path, idsVistos) {
  let pagina = 1;
  let totalItems = null;
  let coletados = 0;

  while (pagina <= MAX_PAGINAS && coletados < MAX_ITENS_POR_TRANSACAO) {
    const totalPaginas = totalItems ? Math.ceil(totalItems / 8) : "?";
    console.log(`[${transacao}] página ${pagina}/${totalPaginas} — coletados: ${coletados}/${MAX_ITENS_POR_TRANSACAO}`);

    let html;
    let tentativa = 0;
    for (;;) {
      try {
        html = await buscarPagina(path, pagina);
        break;
      } catch (err) {
        tentativa++;
        if (tentativa >= MAX_TENTATIVAS_POR_PAGINA) {
          console.error(`Desistindo da página ${pagina} (${transacao}) após ${tentativa} tentativas: ${err.message}`);
          html = null;
          break;
        }
        console.warn(`Falhou página ${pagina} (${transacao}): ${err.message}. Tentativa ${tentativa}/${MAX_TENTATIVAS_POR_PAGINA}...`);
        await sleep(DELAY_MS * 2);
      }
    }
    if (html === null) {
      pagina++;
      continue;
    }

    const { items, totalItems: total } = extrairItens(html);
    if (total !== null) totalItems = total;

    if (items.length === 0) {
      console.log(`Sem itens na página ${pagina}, encerrando ${transacao}.`);
      break;
    }

    const linhas = [];
    for (const item of items) {
      if (idsVistos.has(item.id)) continue;
      idsVistos.add(item.id);

      if (CIDADE_ALVO && item.address?.city?.toLowerCase() !== CIDADE_ALVO.toLowerCase()) {
        continue;
      }

      linhas.push(linhaCsv(mapearImovel(item, transacao)));
      coletados++;
    }

    if (linhas.length > 0) {
      await appendFile(OUTPUT_PATH, linhas.map((l) => l + "\n").join(""), "utf8");
    }

    if (totalItems !== null && pagina * 8 >= totalItems) {
      console.log(`Fim da paginação de ${transacao} (${totalItems} itens no total).`);
      break;
    }

    pagina++;
    await sleep(DELAY_MS);
  }

  return coletados;
}

async function carregarIdsExistentes() {
  const idsVistos = new Set();
  if (!existsSync(OUTPUT_PATH)) return idsVistos;

  const conteudo = await readFile(OUTPUT_PATH, "utf8");
  const idColuna = CSV_COLUNAS.indexOf("id");
  const linhas = conteudo.split("\n").slice(1); // pula o cabeçalho
  for (const linha of linhas) {
    if (!linha.trim()) continue;
    const id = Number(linha.split(";")[idColuna]);
    if (!Number.isNaN(id)) idsVistos.add(id);
  }
  return idsVistos;
}

async function main() {
  if (!existsSync(OUTPUT_PATH)) {
    await writeFile(OUTPUT_PATH, CSV_COLUNAS.join(";") + "\n", "utf8");
  }

  // Recarrega ids já coletados em execuções anteriores para não duplicar
  // linhas no CSV ao rodar o script de novo (ex: para ampliar a amostra).
  const idsVistos = await carregarIdsExistentes();
  console.log(`Ids já coletados anteriormente: ${idsVistos.size}`);
  let totalGeral = 0;

  for (const { transacao, path } of TRANSACOES) {
    const coletados = await coletarTransacao(transacao, path, idsVistos);
    totalGeral += coletados;
    console.log(`[${transacao}] finalizado: ${coletados} imóveis coletados.\n`);
  }

  console.log(`\nCSV: ${OUTPUT_PATH} (${totalGeral} imóveis${CIDADE_ALVO ? ` em "${CIDADE_ALVO}"` : ""})`);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
