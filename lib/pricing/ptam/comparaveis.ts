import { transacoesIndividuais } from "../itbi.ts";
import { ofertasIndividuais } from "../ofertas.ts";
import type { ComparavelEntrada } from "./tipos.ts";

/**
 * Monta os comparáveis reais (ITBI = transação, RGI = oferta) para um
 * bairro+tipo, no formato que o motor PTAM espera. Nenhuma das duas fontes
 * tem estado de conservação, padrão construtivo ou localização granular por
 * imóvel — esses campos ficam undefined, e o motor trata isso como "sem
 * homogeneização possível" (Fp=Fc=Fl=1 para esse comparável), não como uma
 * suposição de que o comparável é igual ao avaliando.
 */
export function montarComparaveis(cidade: string, bairro: string, tipo: string): ComparavelEntrada[] {
  const transacoes: ComparavelEntrada[] = transacoesIndividuais(bairro, tipo).map((transacao) => ({
    id: transacao.id,
    areaM2: transacao.areaM2,
    precoAnuncio: transacao.baseDeCalculo,
    tipo: "transacao",
    // ITBI não tem coluna de vaga — possuiVaga fica undefined (Etapa 0 não
    // ajusta esse comparável), em vez de assumir "sem vaga".
  }));

  const ofertas: ComparavelEntrada[] = ofertasIndividuais(cidade, bairro, tipo).map((oferta) => ({
    id: oferta.id,
    areaM2: oferta.areaM2,
    precoAnuncio: oferta.preco,
    tipo: "oferta",
    possuiVaga: oferta.possuiVaga,
    titulo: oferta.titulo,
    url: oferta.url,
  }));

  return [...transacoes, ...ofertas];
}
