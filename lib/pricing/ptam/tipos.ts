export type TipoComparavel = "oferta" | "transacao";
export type PadraoConstrutivo = "baixo" | "normal" | "alto";
export type EstadoConservacao = "novo" | "bom" | "regular" | "reparos_simples";

export interface Avaliando {
  areaM2: number;
  padraoConstrutivo: PadraoConstrutivo;
  estadoConservacao: EstadoConservacao;
  possuiVaga: boolean;
}

export interface Parametros {
  fatorOferta: number;
  valorVaga: number;
  expoenteArea: number;
}

export interface ComparavelEntrada {
  id: string;
  areaM2: number;
  precoAnuncio: number;
  tipo: TipoComparavel;
  /** undefined = dado indisponível na fonte (ex: ITBI não tem vaga) — nesse
   *  caso a Etapa 0 não faz nenhum ajuste de vaga para esse comparável. */
  possuiVaga?: boolean;
  /** undefined = sem sinal de localização granular — Fl assume 1 (neutro). */
  fatorLocalizacao?: number;
  /** undefined = fonte não classifica por padrão construtivo — Fp assume 1
   *  para esse comparável específico (sem homogeneização possível). */
  padraoConstrutivo?: PadraoConstrutivo;
  /** undefined = fonte não classifica por estado de conservação — Fc assume 1
   *  para esse comparável específico (sem homogeneização possível). */
  estadoConservacao?: EstadoConservacao;
  /** Metadados só para exibição, não entram no cálculo. */
  titulo?: string;
  url?: string;
}

export type MotivoRejeicao = "AREA_FORA_30PCT" | "AJUSTE_EXCESSIVO";

export interface Rejeitado {
  id: string;
  motivo: MotivoRejeicao;
}

export interface MemoriaCalculoItem {
  id: string;
  titulo?: string;
  url?: string;
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

export interface EntradaPtam {
  parametros: Parametros;
  avaliando: Avaliando;
  comparaveis: ComparavelEntrada[];
}

export interface ResultadoPtam {
  status: "ok" | "alerta" | "erro";
  alertas: string[];
  motivoErro: string | null;
  nComparaveisUtilizados: number;
  rejeitados: Rejeitado[];
  descartadosOutlier: string[];
  memoriaCalculo: MemoriaCalculoItem[];
  estatisticas: {
    vuMedio: number | null;
    desvioPadrao: number | null;
    cvPercentual: number | null;
  };
  resultado: {
    valorBruto: number | null;
    valorAdotado: number | null;
    intervaloMin: number | null;
    intervaloMax: number | null;
    campoArbitrioMin: number | null;
    campoArbitrioMax: number | null;
  };
  ruleVersion: string;
}
