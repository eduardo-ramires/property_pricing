import { COEF_CONSERVACAO, COEF_PADRAO } from "./constantes.ts";
import type { EstadoConservacao, PadraoConstrutivo } from "./tipos.ts";

/**
 * Fa é a razão comparável ÷ avaliando (invertida em relação aos demais
 * fatores, de propósito): a elasticidade preço-área é negativa — um imóvel
 * maior vale menos por m², então um comparável maior precisa de fator > 1
 * para ser transposto ao avaliando.
 */
export function calcularFa(areaComparavel: number, areaAvaliando: number, expoenteArea: number): number {
  return Math.pow(areaComparavel / areaAvaliando, expoenteArea);
}

/**
 * Fp/Fc seguem a convenção avaliando ÷ comparável. Quando o comparável não
 * tem o dado (undefined), retorna 1 — não há como homogeneizar o que não se
 * conhece, e forçar um valor seria fabricar precisão que não existe.
 */
export function calcularFp(avaliando: PadraoConstrutivo, comparavel: PadraoConstrutivo | undefined): number {
  if (comparavel === undefined) return 1;
  return COEF_PADRAO[avaliando] / COEF_PADRAO[comparavel];
}

export function calcularFc(avaliando: EstadoConservacao, comparavel: EstadoConservacao | undefined): number {
  if (comparavel === undefined) return 1;
  return COEF_CONSERVACAO[avaliando] / COEF_CONSERVACAO[comparavel];
}

/** Forma aditiva da NBR 14.653-2 — nunca multiplicar os fatores entre si. */
export function somaAditiva(fatores: number[]): number {
  return 1 + fatores.reduce((acumulado, fator) => acumulado + (fator - 1), 0);
}
