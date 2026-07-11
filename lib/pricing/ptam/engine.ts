import {
  IDEAL_COMPARAVEIS,
  LIMITE_AREA_PCT,
  LIMITE_CV_ALERTA,
  LIMITE_OUTLIER_PCT,
  LIMITE_SOMA_ADITIVA_MAX,
  LIMITE_SOMA_ADITIVA_MIN,
  MIN_COMPARAVEIS,
  RULE_VERSION,
} from "./constantes.ts";
import { calcularFa, calcularFc, calcularFp, somaAditiva } from "./fatores.ts";
import { coeficienteVariacao, desvioPadraoAmostral, media } from "./estatistica.ts";
import { arredondarMultiplo, arredondarValorAdotado } from "./arredondamento.ts";
import type {
  Avaliando,
  ComparavelEntrada,
  EntradaPtam,
  MemoriaCalculoItem,
  Parametros,
  Rejeitado,
  ResultadoPtam,
} from "./tipos.ts";

/**
 * Motor de cálculo do Valor PTAM — Método Comparativo Direto de Dados de
 * Mercado com tratamento por fatores (ABNT NBR 14.653-2, Res. COFECI
 * 1.066/2007), forma aditiva. Função pura e determinística: mesmo input,
 * mesmo output, sempre — nada de rede, I/O ou LLM aqui.
 *
 * Todos os valores intermediários (preço tratado, VU, VUh, soma aditiva,
 * médias) são mantidos em ponto flutuante de precisão total até a montagem
 * da resposta — só aí arredondamos, pra exibição.
 *
 * Import: nossos comparáveis reais (ITBI/RGI) não têm padrão construtivo,
 * estado de conservação nem localização granular por item — Fp/Fc/Fl caem no
 * valor neutro (1) quando o comparável não informa esses campos (ver
 * calcularFp/calcularFc em fatores.ts). Esta função é fiel ao documento-fonte
 * e NÃO aplica nenhum ajuste adicional do avaliando no agregado final — para
 * o nosso caso real (comparáveis sem esse dado), esse ajuste compensatório
 * é responsabilidade de quem chama (ver aplicarAjusteAgregado em
 * ajusteAgregado.ts). Isso mantém este motor puro fiel ao golden test, que
 * fornece estado_conservacao/padrao_construtivo reais por comparável.
 */
export function calcularValorPtam(entrada: EntradaPtam): ResultadoPtam {
  const { parametros, avaliando, comparaveis } = entrada;

  const processados = comparaveis.map((comparavel) => processarComparavel(comparavel, avaliando, parametros));

  const rejeitados: Rejeitado[] = [];
  const aprovados = processados.filter((item) => {
    const desvioArea = Math.abs(item.comparavel.areaM2 - avaliando.areaM2) / avaliando.areaM2;
    if (desvioArea > LIMITE_AREA_PCT) {
      rejeitados.push({ id: item.comparavel.id, motivo: "AREA_FORA_30PCT" });
      return false;
    }
    if (item.somaAditiva < LIMITE_SOMA_ADITIVA_MIN || item.somaAditiva > LIMITE_SOMA_ADITIVA_MAX) {
      rejeitados.push({ id: item.comparavel.id, motivo: "AJUSTE_EXCESSIVO" });
      return false;
    }
    return true;
  });

  if (aprovados.length === 0) {
    return erro("AMOSTRA_INSUFICIENTE", rejeitados, []);
  }

  const mediaInicial = media(aprovados.map((item) => item.vuh));
  const descartadosOutlier: string[] = [];
  const finais = aprovados.filter((item) => {
    const desvio = Math.abs(item.vuh - mediaInicial) / mediaInicial;
    if (desvio > LIMITE_OUTLIER_PCT) {
      descartadosOutlier.push(item.comparavel.id);
      return false;
    }
    return true;
  });

  if (finais.length < MIN_COMPARAVEIS) {
    return erro("AMOSTRA_INSUFICIENTE", rejeitados, descartadosOutlier);
  }

  const vuhFinais = finais.map((item) => item.vuh);
  const vuMedio = media(vuhFinais);
  const desvioPadrao = desvioPadraoAmostral(vuhFinais);
  const cv = coeficienteVariacao(vuhFinais);

  const alertas: string[] = [];
  let status: "ok" | "alerta" = "ok";
  if (cv > LIMITE_CV_ALERTA) {
    status = "alerta";
    alertas.push("CV_ALTO: amostra heterogênea — revisar comparáveis antes de emitir");
  }
  if (finais.length < IDEAL_COMPARAVEIS) {
    status = "alerta";
    alertas.push("AMOSTRA_MINIMA: ideal 6 a 10 comparáveis");
  }

  // Etapa 8 — fiel ao documento-fonte: quando Fc/Fp já foram aplicados por
  // comparável (dado disponível), o VUh final já reflete o avaliando, sem
  // ajuste adicional aqui. Se os comparáveis não tinham esse dado (nosso caso
  // real, ITBI/RGI), a compensação fica a cargo de quem chama esse motor
  // (ver aplicarAjusteAgregado em ajusteAgregado.ts) — não duplicar aqui.
  const valorBruto = vuMedio * avaliando.areaM2;
  const valorAdotado = arredondarValorAdotado(valorBruto);

  return {
    status,
    alertas,
    motivoErro: null,
    nComparaveisUtilizados: finais.length,
    rejeitados,
    descartadosOutlier,
    memoriaCalculo: finais.map((item) => paraMemoria(item)),
    estatisticas: {
      vuMedio: arredondar2(vuMedio),
      desvioPadrao: arredondar2(desvioPadrao),
      cvPercentual: arredondar2(cv * 100),
    },
    resultado: {
      valorBruto: arredondar2(valorBruto),
      valorAdotado,
      intervaloMin: arredondarMultiplo(valorAdotado * 0.95, 1000),
      intervaloMax: arredondarMultiplo(valorAdotado * 1.05, 1000),
      campoArbitrioMin: arredondarMultiplo(valorAdotado * 0.85, 1000),
      campoArbitrioMax: arredondarMultiplo(valorAdotado * 1.15, 1000),
    },
    ruleVersion: RULE_VERSION,
  };
}

interface ComparavelProcessado {
  comparavel: ComparavelEntrada;
  precoTratado: number;
  vu: number;
  vuPosOferta: number;
  fa: number;
  fl: number;
  fp: number;
  fc: number;
  somaAditiva: number;
  vuh: number;
}

function processarComparavel(
  comparavel: ComparavelEntrada,
  avaliando: Avaliando,
  parametros: Parametros,
): ComparavelProcessado {
  const precoTratado = tratarVaga(comparavel, avaliando, parametros.valorVaga);
  const vu = precoTratado / comparavel.areaM2;
  const fo = comparavel.tipo === "transacao" ? 1 : parametros.fatorOferta;
  const vuPosOferta = vu * fo;

  const fa = calcularFa(comparavel.areaM2, avaliando.areaM2, parametros.expoenteArea);
  const fl = comparavel.fatorLocalizacao ?? 1;
  const fp = calcularFp(avaliando.padraoConstrutivo, comparavel.padraoConstrutivo);
  const fc = calcularFc(avaliando.estadoConservacao, comparavel.estadoConservacao);
  const soma = somaAditiva([fa, fl, fp, fc]);
  const vuh = vuPosOferta * soma;

  return { comparavel, precoTratado, vu, vuPosOferta, fa, fl, fp, fc, somaAditiva: soma, vuh };
}

function paraMemoria(item: ComparavelProcessado): MemoriaCalculoItem {
  return {
    id: item.comparavel.id,
    titulo: item.comparavel.titulo,
    url: item.comparavel.url,
    precoTratado: arredondar2(item.precoTratado),
    vu: arredondar2(item.vu),
    vuPosOferta: arredondar2(item.vuPosOferta),
    fa: arredondar4(item.fa),
    fl: arredondar4(item.fl),
    fp: arredondar4(item.fp),
    fc: arredondar4(item.fc),
    somaAditiva: arredondar4(item.somaAditiva),
    vuh: arredondar2(item.vuh),
  };
}

/** Etapa 0 — benfeitoria destacável (vaga). `possuiVaga` indefinido no
 *  comparável significa que a fonte não tem esse dado (ex: ITBI): nesse caso
 *  não fazemos ajuste algum, em vez de assumir "sem vaga". */
function tratarVaga(comparavel: ComparavelEntrada, avaliando: Avaliando, valorVaga: number): number {
  if (comparavel.possuiVaga === undefined) return comparavel.precoAnuncio;
  if (comparavel.possuiVaga && !avaliando.possuiVaga) return comparavel.precoAnuncio - valorVaga;
  if (!comparavel.possuiVaga && avaliando.possuiVaga) return comparavel.precoAnuncio + valorVaga;
  return comparavel.precoAnuncio;
}

function erro(motivo: string, rejeitados: Rejeitado[], descartadosOutlier: string[]): ResultadoPtam {
  return {
    status: "erro",
    alertas: [],
    motivoErro: motivo,
    nComparaveisUtilizados: 0,
    rejeitados,
    descartadosOutlier,
    memoriaCalculo: [],
    estatisticas: { vuMedio: null, desvioPadrao: null, cvPercentual: null },
    resultado: {
      valorBruto: null,
      valorAdotado: null,
      intervaloMin: null,
      intervaloMax: null,
      campoArbitrioMin: null,
      campoArbitrioMax: null,
    },
    ruleVersion: RULE_VERSION,
  };
}

function arredondar2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function arredondar4(valor: number): number {
  return Math.round(valor * 10000) / 10000;
}
