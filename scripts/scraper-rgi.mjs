/**
 * scraper-rgi.mjs
 *
 * Coleta imóveis à venda da Rede Gaúcha de Imóveis (redegauchadeimoveis.com.br)
 * — só a seção de comprar (/venda) — e exporta para dataset/rgi-imoveis.csv,
 * pra usar como dataset de ofertas ativas na precificação (ver CLAUDE.md e
 * lib/pricing/ptam/comparaveis.ts). Substitui o Jetlar como fonte de ofertas.
 *
 * IMPORTANTE:
 * - https://www.redegauchadeimoveis.com.br/robots.txt permite crawling de
 *   /venda (só bloqueia áreas de conta/checkout/admin).
 * - Mesma plataforma do scraper do Jetlar (JSON idêntico embutido via RSC do
 *   Next.js) — a técnica de extração é a mesma, sem navegador/Playwright.
 * - Só capturamos os campos que o motor PTAM realmente usa: tipo, área,
 *   preço, bairro/cidade e vaga. Quartos/banheiros/suítes ficam de bônus
 *   (informativos, não entram no cálculo).
 * - Busca CONCORRENTE (várias páginas em paralelo) pra ser rápido — ajuste
 *   JETLAR_CONCORRENCIA se estiver sobrecarregando o site.
 *
 * Uso:
 *   node scripts/scraper-rgi.mjs
 *   RGI_CIDADE="Porto Alegre" RGI_MAX_ITENS=500 node scripts/scraper-rgi.mjs
 */

import { appendFile, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const BASE_URL = "https://www.redegauchadeimoveis.com.br";
const USER_AGENT = "Mozilla/5.0 (compatible; PrecificaJustaBot/1.0; +mailto:seu-email@exemplo.com)";

// Recorte geográfico do MVP — o ITBI (transações) só cobre Porto Alegre, e o
// motor PTAM cruza os dois; ofertas de outra cidade não têm com o que cruzar.
const CIDADE_ALVO = process.env.RGI_CIDADE ?? "Porto Alegre";

const MAX_PAGINAS = Number(process.env.RGI_MAX_PAGINAS ?? 4000);
const MAX_ITENS = Number(process.env.RGI_MAX_ITENS ?? 300);
const DELAY_MS = Number(process.env.RGI_DELAY_MS ?? 400);
const CONCORRENCIA = Number(process.env.RGI_CONCORRENCIA ?? 5);
const TIMEOUT_MS = Number(process.env.RGI_TIMEOUT_MS ?? 20000);
const MAX_TENTATIVAS_POR_PAGINA = 3;

const OUTPUT_PATH = "dataset/rgi-imoveis.csv";
const PATH_VENDA = "venda";

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
  "banheiros",
  "suites",
  "vagas",
  "area_total_m2",
  "area_util_m2",
  "area_privativa_m2",
  "preco",
  "preco_total",
  "url",
  "coletado_em",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function buscarPagina(pagina) {
  const url = `${BASE_URL}/${PATH_VENDA}?pagina=${pagina}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.text();
}

/**
 * Mesma técnica do scraper do Jetlar: o payload de listagem vem embutido no
 * HTML dentro de `self.__next_f.push(...)` (RSC flight data do Next.js),
 * como uma string escapada como se fosse conteúdo de uma string JSON.
 * Envolver em aspas e rodar JSON.parse uma vez faz o desescape correto
 * (diferente de um replace ingênuo de `\"` por `"`, que quebra em títulos
 * com aspas literais).
 */
function extrairItens(html) {
  const marcadorInicio = '\\"items\\":[';
  const inicio = html.indexOf(marcadorInicio);
  if (inicio === -1) return { items: [], totalItems: null };

  const inicioArray = inicio + '\\"items\\":'.length;
  const marcadorFim = '}]},\\"nextCursor\\"';
  const fim = html.indexOf(marcadorFim, inicioArray);
  if (fim === -1) return { items: [], totalItems: null };

  const bruto = html.slice(inicioArray, fim + 2);
  const jsonNivelUm = JSON.parse(`"${bruto}"`);
  const items = JSON.parse(jsonNivelUm);

  const totalMatch = html.match(/\\"totalItems\\":(\d+)/);
  const totalItems = totalMatch ? Number(totalMatch[1]) : null;

  return { items, totalItems };
}

function paraReais(valorEmCentavos) {
  return typeof valorEmCentavos === "number" ? valorEmCentavos / 100 : "";
}

function mapearImovel(item) {
  const contrato = item.contracts?.[0] ?? {};
  return {
    fonte: "rgi",
    transacao: "venda",
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
    banheiros: item.bathrooms ?? "",
    suites: item.suites ?? "",
    vagas: item.garage ?? "",
    area_total_m2: item.totalArea?.value ?? "",
    area_util_m2: item.usefulArea?.value ?? "",
    area_privativa_m2: item.privateArea?.value ?? "",
    preco: paraReais(contrato.price?.value),
    preco_total: paraReais(contrato.totalPrice?.value),
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

async function carregarIdsExistentes() {
  const idsVistos = new Set();
  if (!existsSync(OUTPUT_PATH)) return idsVistos;

  const conteudo = await readFile(OUTPUT_PATH, "utf8");
  const idColuna = CSV_COLUNAS.indexOf("id");
  for (const linha of conteudo.split("\n").slice(1)) {
    if (!linha.trim()) continue;
    const id = Number(linha.split(";")[idColuna]);
    if (!Number.isNaN(id)) idsVistos.add(id);
  }
  return idsVistos;
}

/** Busca uma página com retry; retorna null se desistir (página pulada). */
async function buscarPaginaComRetry(pagina) {
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_POR_PAGINA; tentativa++) {
    try {
      return await buscarPagina(pagina);
    } catch (err) {
      if (tentativa >= MAX_TENTATIVAS_POR_PAGINA) {
        console.warn(`Desistindo da página ${pagina} após ${tentativa} tentativas: ${err.message}`);
        return null;
      }
      await sleep(DELAY_MS * 2);
    }
  }
  return null;
}

async function main() {
  if (!existsSync(OUTPUT_PATH)) {
    await writeFile(OUTPUT_PATH, CSV_COLUNAS.join(";") + "\n", "utf8");
  }

  // Recarrega ids já coletados em execuções anteriores para não duplicar
  // linhas no CSV ao rodar o script de novo.
  const idsVistos = await carregarIdsExistentes();
  console.log(`Ids já coletados anteriormente: ${idsVistos.size}`);

  let totalItems = null;
  let proximaPagina = 1;
  let coletados = 0;
  let paginasSemItens = 0;

  // Pool de workers: cada um pega a próxima página disponível e processa,
  // várias em paralelo — é isso que faz a coleta ser rápida.
  async function worker() {
    while (
      proximaPagina <= MAX_PAGINAS &&
      coletados < MAX_ITENS &&
      paginasSemItens < CONCORRENCIA * 2 // várias páginas seguidas vazias = acabou o catálogo
    ) {
      const pagina = proximaPagina++;
      const totalPaginas = totalItems ? Math.ceil(totalItems / 8) : "?";
      console.log(`[venda] página ${pagina}/${totalPaginas} — coletados: ${coletados}/${MAX_ITENS}`);

      const html = await buscarPaginaComRetry(pagina);
      if (html === null) continue;

      let items;
      let total;
      try {
        ({ items, totalItems: total } = extrairItens(html));
      } catch (err) {
        console.warn(`Falha ao extrair itens da página ${pagina}: ${err.message}. Pulando página.`);
        continue;
      }
      if (total !== null) totalItems = total;

      if (items.length === 0) {
        paginasSemItens++;
        continue;
      }
      paginasSemItens = 0;

      const linhas = [];
      for (const item of items) {
        if (idsVistos.has(item.id)) continue;
        idsVistos.add(item.id);

        if (CIDADE_ALVO && item.address?.city?.toLowerCase() !== CIDADE_ALVO.toLowerCase()) {
          continue;
        }

        linhas.push(linhaCsv(mapearImovel(item)));
        coletados++;
      }

      if (linhas.length > 0) {
        await appendFile(OUTPUT_PATH, linhas.map((l) => l + "\n").join(""), "utf8");
      }

      await sleep(DELAY_MS);
    }
  }

  const workers = Array.from({ length: CONCORRENCIA }, () => worker());
  await Promise.all(workers);

  console.log(`\nCSV: ${OUTPUT_PATH} (${coletados} imóveis novos${CIDADE_ALVO ? ` em "${CIDADE_ALVO}"` : ""})`);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
