import { normalizarTexto } from "./normalizar.ts";
import { montarComparaveis } from "./ptam/comparaveis.ts";
import { calcularValorPtam } from "./ptam/engine.ts";
import { aplicarAjusteAgregado } from "./ptam/ajusteAgregado.ts";
import { EXPOENTE_AREA_PADRAO, FATOR_OFERTA_PADRAO, VALOR_VAGA_PADRAO } from "./ptam/constantes.ts";
import type { Avaliando, EstadoConservacao, PadraoConstrutivo, ResultadoPtam } from "./ptam/tipos.ts";

export type { EstadoConservacao, PadraoConstrutivo };

// O dataset de ITBI (transações reais) cobre só Porto Alegre. O de ofertas
// (RGI) é nacional, então o motor PTAM sempre roda, mas fica só com
// comparáveis do tipo "oferta" fora dessa cobertura.
const CIDADE_COBERTA_PELO_ITBI = "Porto Alegre";

// Faixa de tolerância ao redor do valor adotado para considerar o preço
// desejado pelo usuário "dentro do mercado" em vez de acima/abaixo.
const FAIXA_DENTRO_DO_MERCADO = 0.1;

export type Classificacao = "abaixo_do_mercado" | "dentro_do_mercado" | "acima_do_mercado";

export interface InputPrecificacao {
  cidade: string;
  bairro: string;
  tipo: string;
  areaM2: number;
  estadoConservacao: EstadoConservacao;
  padraoConstrutivo: PadraoConstrutivo;
  /** Metadados de contexto — a metodologia NBR 14.653-2 (Método Comparativo
   *  Direto de Dados de Mercado) homogeneiza por área e vaga, não por
   *  quartos/banheiros/suítes/mobília. Esses campos ficam só informativos
   *  no resultado, não entram no cálculo do valor. */
  quartos?: number;
  vagas?: number;
  banheiros?: number;
  suites?: number;
  mobiliado?: boolean;
  /** Preço que o usuário pretende pedir pelo imóvel, opcional — usado só para
   *  mostrar o quanto ESSE valor específico desvia do valor adotado. */
  precoDesejado?: number;
}

export interface AvaliacaoPrecoDesejado {
  precoDesejado: number;
  indiceDesvio: number;
  classificacao: Classificacao;
}

export interface ResultadoPrecificacao extends ResultadoPtam {
  /** Só preenchido quando o usuário informa precoDesejado E o motor PTAM
   *  chegou a um valor adotado — compara o valor que ele quer pedir com o
   *  valor adotado, usando o mesmo critério de classificação. */
  avaliacaoPrecoDesejado: AvaliacaoPrecoDesejado | null;
  /** Avisos nossos, de cobertura de dados — além dos "alertas" do motor PTAM
   *  (que são regra de negócio: CV alto, amostra mínima). */
  avisos: string[];
}

function classificar(indiceDesvio: number): Classificacao {
  if (indiceDesvio < -FAIXA_DENTRO_DO_MERCADO) return "abaixo_do_mercado";
  if (indiceDesvio > FAIXA_DENTRO_DO_MERCADO) return "acima_do_mercado";
  return "dentro_do_mercado";
}

export function calcularPrecificacao(input: InputPrecificacao): ResultadoPrecificacao {
  const avisos: string[] = [];

  if (normalizarTexto(input.cidade) !== normalizarTexto(CIDADE_COBERTA_PELO_ITBI)) {
    avisos.push(
      `Dados de vendas (ITBI) cobrem apenas ${CIDADE_COBERTA_PELO_ITBI}; para "${input.cidade}" o motor usa só comparáveis de oferta (RGI).`,
    );
  }

  const comparaveis = montarComparaveis(input.cidade, input.bairro, input.tipo);

  const avaliando: Avaliando = {
    areaM2: input.areaM2,
    estadoConservacao: input.estadoConservacao,
    padraoConstrutivo: input.padraoConstrutivo,
    possuiVaga: (input.vagas ?? 0) > 0,
  };

  const resultadoBruto = calcularValorPtam({
    parametros: {
      fatorOferta: FATOR_OFERTA_PADRAO,
      valorVaga: VALOR_VAGA_PADRAO,
      expoenteArea: EXPOENTE_AREA_PADRAO,
    },
    avaliando,
    comparaveis,
  });

  // Nossos comparáveis reais (ITBI/RGI) nunca têm estado de conservação
  // nem padrão construtivo próprios (ver comparaveis.ts) — o motor não pôde
  // homogeneizar por comparável, então aplicamos a compensação agregada do
  // avaliando aqui, sempre.
  const resultado = aplicarAjusteAgregado(resultadoBruto, avaliando);

  let avaliacaoPrecoDesejado: AvaliacaoPrecoDesejado | null = null;
  if (input.precoDesejado && resultado.resultado.valorAdotado) {
    const valorAdotado = resultado.resultado.valorAdotado;
    const indiceDesvio = (input.precoDesejado - valorAdotado) / valorAdotado;
    avaliacaoPrecoDesejado = {
      precoDesejado: input.precoDesejado,
      indiceDesvio,
      classificacao: classificar(indiceDesvio),
    };
  } else if (input.precoDesejado) {
    avisos.push("Não foi possível avaliar o preço desejado: motor PTAM não chegou a um valor adotado (ver status/motivoErro).");
  }

  return { ...resultado, avaliacaoPrecoDesejado, avisos };
}
