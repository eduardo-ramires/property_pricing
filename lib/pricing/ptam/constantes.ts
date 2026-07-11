import type { EstadoConservacao, PadraoConstrutivo } from "./tipos.ts";

export const RULE_VERSION = "1.0.0";

export const FATOR_OFERTA_PADRAO = 0.9;
export const EXPOENTE_AREA_PADRAO = 0.125; // 1/8 — apartamentos
export const VALOR_VAGA_PADRAO = 35000;

export const COEF_PADRAO: Record<PadraoConstrutivo, number> = {
  baixo: 0.9,
  normal: 1.0,
  alto: 1.1,
};

// Escala Heidecke simplificada.
export const COEF_CONSERVACAO: Record<EstadoConservacao, number> = {
  novo: 1.0,
  bom: 0.97,
  regular: 0.92,
  reparos_simples: 0.82,
};

export const LIMITE_AREA_PCT = 0.3; // Etapa 5 — rejeição por desvio de área
export const LIMITE_SOMA_ADITIVA_MIN = 0.8; // Etapa 5 — rejeição por ajuste excessivo
export const LIMITE_SOMA_ADITIVA_MAX = 1.2;
export const LIMITE_OUTLIER_PCT = 0.3; // Etapa 6 — saneamento estatístico
export const LIMITE_CV_ALERTA = 0.3; // Etapa 7
export const MIN_COMPARAVEIS = 3; // Etapa 7 — abaixo disso, status "erro"
export const IDEAL_COMPARAVEIS = 6; // Etapa 7 — abaixo disso, alerta informativo
