import { COEF_CONSERVACAO, COEF_PADRAO } from "./constantes.ts";
import { arredondarMultiplo, arredondarValorAdotado } from "./arredondamento.ts";
import type { Avaliando, ResultadoPtam } from "./tipos.ts";

/**
 * Compensação para quando os comparáveis não têm estado de conservação nem
 * padrão construtivo próprios (nosso caso real: nem ITBI nem RGI têm essa
 * coluna) — nesse cenário o motor não homogeneizou por comparável (Fc=Fp=1
 * para todos, ver fatores.ts), então aplicamos o ajuste do AVALIANDO uma
 * única vez sobre o resultado agregado.
 *
 * NÃO chamar isso quando os comparáveis já carregam estado_conservacao e
 * padrao_construtivo próprios — o motor já homogeneizou por comparável
 * (Etapas 3-4) e aplicar de novo aqui duplicaria o ajuste. É por isso que
 * esse passo fica fora de engine.ts: calcularValorPtam() sozinho é fiel ao
 * golden test, que fornece esse dado por comparável.
 */
export function aplicarAjusteAgregado(resultado: ResultadoPtam, avaliando: Avaliando): ResultadoPtam {
  if (resultado.status === "erro" || resultado.resultado.valorBruto === null) return resultado;

  const fatorConservacao = COEF_CONSERVACAO[avaliando.estadoConservacao];
  const fatorPadrao = COEF_PADRAO[avaliando.padraoConstrutivo];
  const valorBruto = resultado.resultado.valorBruto * fatorConservacao * fatorPadrao;
  const valorAdotado = arredondarValorAdotado(valorBruto);

  return {
    ...resultado,
    resultado: {
      valorBruto: Math.round(valorBruto * 100) / 100,
      valorAdotado,
      intervaloMin: arredondarMultiplo(valorAdotado * 0.95, 1000),
      intervaloMax: arredondarMultiplo(valorAdotado * 1.05, 1000),
      campoArbitrioMin: arredondarMultiplo(valorAdotado * 0.85, 1000),
      campoArbitrioMax: arredondarMultiplo(valorAdotado * 1.15, 1000),
    },
  };
}
