import { normalizarTexto } from "./normalizar";

/**
 * O ITBI classifica por "finalidade_construcao" (vocabulário do cadastro
 * fiscal municipal), enquanto o Jetlar usa um vocabulário mais coloquial
 * ("Apartamento", "Casa"...). Este mapeamento traduz o tipo recebido no
 * input (vocabulário Jetlar) para os valores equivalentes de
 * finalidade_construcao no ITBI. Cobre os tipos mais comuns dos dois
 * datasets — tipos fora dessa lista caem no fallback por substring em
 * lib/pricing/itbi.ts.
 */
export const MAPEAMENTO_TIPO_ITBI: Record<string, string[]> = {
  APARTAMENTO: ["APARTAMENTO", "APARTAMENTO DE COBERTURA", "APART-HOTEL(FLAT)"],
  CASA: [
    "RESIDENCIA ISOLADA",
    "RESIDENCIA PADRONIZADA EM COND HORIZONTAL FECHADO",
    "RESIDENCIA DE FRENTE COM INTERIORES",
    "RESIDENCIA DE INTERIOR",
    "RESIDENCIA CONDOM HORIZ ABERTO SEM AREA USO COMUM",
    "RESIDENCIA NAO PADRONIZ EM CONDOM HORIZONTAL FECHADO",
  ],
  "SALA COMERCIAL": ["SALA COMERCIAL"],
  LOJA: ["LOJA EM SHOPPING", "LOJA TERREA EM EDIFICIO"],
  TERRENO: ["TERRENO"],
  COBERTURA: ["APARTAMENTO DE COBERTURA"],
};

export function finalidadesConstrucaoParaTipo(tipo: string): string[] {
  return MAPEAMENTO_TIPO_ITBI[normalizarTexto(tipo)] ?? [];
}

export function tipoCorrespondeAFinalidade(tipo: string, finalidadeConstrucao: string): boolean {
  const finalidadesMapeadas = finalidadesConstrucaoParaTipo(tipo);
  const finalidadeNormalizada = normalizarTexto(finalidadeConstrucao);

  if (finalidadesMapeadas.length > 0) {
    return finalidadesMapeadas.includes(finalidadeNormalizada);
  }

  // Tipo sem mapeamento conhecido: fallback por substring.
  return finalidadeNormalizada.includes(normalizarTexto(tipo));
}
