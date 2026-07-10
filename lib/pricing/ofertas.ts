import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { bairrosCorrespondem, normalizarTexto } from "./normalizar";
import { AMOSTRA_MINIMA, media, mediana } from "./estatisticas";

/**
 * Ofertas ativas coletadas do Jetlar (scripts/scraper-jetlar.mjs). Só
 * consideramos imóveis à venda: o ITBI só cobre transmissões de venda, então
 * não há referência para comparar aluguel.
 */
const CAMINHO_ARQUIVO = join(process.cwd(), "dataset", "jetlar-imoveis.csv");

interface OfertaImovel {
  id: string;
  titulo: string;
  cidade: string;
  bairro: string;
  tipo: string;
  quartos: number | null;
  mobiliado: boolean | null;
  areaM2: number;
  preco: number;
  url: string;
}

let ofertasCache: OfertaImovel[] | null = null;

function numeroOuNull(valor: string | undefined): number | null {
  if (!valor || valor.trim() === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function areaDaOferta(registro: Record<string, string>): number | null {
  return (
    numeroOuNull(registro.area_total_m2) ??
    numeroOuNull(registro.area_util_m2) ??
    numeroOuNull(registro.area_privativa_m2)
  );
}

function carregarOfertas(): OfertaImovel[] {
  if (ofertasCache) return ofertasCache;

  if (!existsSync(CAMINHO_ARQUIVO)) {
    ofertasCache = [];
    return ofertasCache;
  }

  const conteudo = readFileSync(CAMINHO_ARQUIVO, "utf8");

  let registros: Record<string, string>[];
  try {
    registros = parse(conteudo, {
      delimiter: ";",
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    // O CSV é escrito por um scraper que roda em background e pode ter
    // linhas corrompidas se dois processos gravarem ao mesmo tempo. Preferir
    // "amostra insuficiente" a derrubar o endpoint inteiro com 500.
    console.error("Falha ao parsear dataset/jetlar-imoveis.csv:", err);
    ofertasCache = [];
    return ofertasCache;
  }

  ofertasCache = registros
    .filter((registro) => registro.transacao === "venda")
    .map(
      (registro): OfertaImovel => ({
        id: registro.id,
        titulo: registro.titulo ?? "",
        cidade: registro.cidade ?? "",
        bairro: registro.bairro ?? "",
        tipo: registro.tipo ?? "",
        quartos: numeroOuNull(registro.quartos),
        mobiliado: registro.mobiliado === "true" ? true : registro.mobiliado === "false" ? false : null,
        areaM2: areaDaOferta(registro) ?? 0,
        preco: numeroOuNull(registro.preco) ?? 0,
        url: registro.url ?? "",
      }),
    )
    .filter((oferta) => oferta.preco > 0 && oferta.areaM2 > 0);

  return ofertasCache;
}

export interface EstatisticasOfertas {
  amostra: number;
  precoM2Mediana: number;
  precoM2Media: number;
  nivelFiltro: "bairro+tipo+quartos+mobiliado" | "bairro+tipo+quartos" | "bairro+tipo";
  comparaveis: Array<Pick<OfertaImovel, "id" | "titulo" | "quartos" | "mobiliado" | "areaM2" | "preco" | "url">>;
}

export function estatisticasOfertas(params: {
  cidade: string;
  bairro: string;
  tipo: string;
  quartos: number;
  mobiliado: boolean;
}): EstatisticasOfertas | null {
  const ofertas = carregarOfertas();

  const daCidade = ofertas.filter((oferta) => normalizarTexto(oferta.cidade) === normalizarTexto(params.cidade));
  const doBairro = daCidade.filter((oferta) => bairrosCorrespondem(oferta.bairro, params.bairro));
  const doTipo = doBairro.filter((oferta) => normalizarTexto(oferta.tipo) === normalizarTexto(params.tipo));

  const tentativas: Array<{ nivel: EstatisticasOfertas["nivelFiltro"]; itens: OfertaImovel[] }> = [
    {
      nivel: "bairro+tipo+quartos+mobiliado",
      itens: doTipo.filter((oferta) => oferta.quartos === params.quartos && oferta.mobiliado === params.mobiliado),
    },
    { nivel: "bairro+tipo+quartos", itens: doTipo.filter((oferta) => oferta.quartos === params.quartos) },
    { nivel: "bairro+tipo", itens: doTipo },
  ];

  for (const tentativa of tentativas) {
    const precosM2 = tentativa.itens.map((oferta) => oferta.preco / oferta.areaM2);

    if (precosM2.length >= AMOSTRA_MINIMA) {
      return {
        amostra: precosM2.length,
        precoM2Mediana: mediana(precosM2),
        precoM2Media: media(precosM2),
        nivelFiltro: tentativa.nivel,
        comparaveis: tentativa.itens
          .slice(0, 5)
          .map(({ id, titulo, quartos, mobiliado, areaM2, preco, url }) => ({
            id,
            titulo,
            quartos,
            mobiliado,
            areaM2,
            preco,
            url,
          })),
      };
    }
  }

  return null;
}
