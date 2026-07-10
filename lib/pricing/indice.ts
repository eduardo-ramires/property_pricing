import { estatisticasVendas } from "./itbi";
import { estatisticasOfertas, type EstatisticasOfertas } from "./ofertas";
import { normalizarTexto } from "./normalizar";

// O dataset de ITBI (transações reais) cobre só Porto Alegre. O de ofertas
// (Jetlar) é nacional, então essa checagem só afeta a perna "vendas".
const CIDADE_COBERTA_PELO_ITBI = "Porto Alegre";

// Faixa de tolerância ao redor do preço justo estimado para considerar o
// anúncio "dentro do mercado" em vez de acima/abaixo.
const FAIXA_DENTRO_DO_MERCADO = 0.1;

export interface InputPrecificacao {
  cidade: string;
  bairro: string;
  tipo: string;
  areaM2: number;
  quartos: number;
  mobiliado: boolean;
  /** Preço que o usuário pretende pedir pelo imóvel, opcional — usado só para
   *  mostrar o quanto ESSE valor específico desvia do preço justo estimado. */
  precoDesejado?: number;
}

export interface AnaliseVendas {
  amostra: number;
  precoM2Mediana: number;
  precoM2Media: number;
  nivelFiltro: string;
  precoJustoEstimado: number;
}

export interface AnaliseOfertas {
  amostra: number;
  precoM2Mediana: number;
  precoM2Media: number;
  nivelFiltro: string;
  precoOfertadoEstimado: number;
  comparaveis: EstatisticasOfertas["comparaveis"];
}

export type Classificacao = "abaixo_do_mercado" | "dentro_do_mercado" | "acima_do_mercado";

export interface AvaliacaoPrecoDesejado {
  precoDesejado: number;
  indiceDesvio: number;
  classificacao: Classificacao;
}

export interface ResultadoPrecificacao {
  input: InputPrecificacao;
  vendas: AnaliseVendas | null;
  ofertas: AnaliseOfertas | null;
  indiceDesvio: number | null;
  classificacao: Classificacao | null;
  /** Só preenchido quando o usuário informa precoDesejado E temos preço
   *  justo (ITBI) calculado — compara o valor que ele quer pedir com o
   *  preço justo, usando o mesmo critério de classificação. */
  avaliacaoPrecoDesejado: AvaliacaoPrecoDesejado | null;
  avisos: string[];
}

function classificar(indiceDesvio: number): Classificacao {
  if (indiceDesvio < -FAIXA_DENTRO_DO_MERCADO) return "abaixo_do_mercado";
  if (indiceDesvio > FAIXA_DENTRO_DO_MERCADO) return "acima_do_mercado";
  return "dentro_do_mercado";
}

export function calcularPrecificacao(input: InputPrecificacao): ResultadoPrecificacao {
  const avisos: string[] = [];

  let vendas: AnaliseVendas | null = null;
  if (normalizarTexto(input.cidade) === normalizarTexto(CIDADE_COBERTA_PELO_ITBI)) {
    const stats = estatisticasVendas(input.bairro, input.tipo);
    if (stats) {
      vendas = { ...stats, precoJustoEstimado: stats.precoM2Mediana * input.areaM2 };
    } else {
      avisos.push(`Amostra insuficiente de vendas (ITBI) para o bairro/tipo informado.`);
    }
  } else {
    avisos.push(
      `Dados de vendas (ITBI) cobrem apenas ${CIDADE_COBERTA_PELO_ITBI}; sem referência de vendas para "${input.cidade}".`,
    );
  }

  let ofertas: AnaliseOfertas | null = null;
  const statsOfertas = estatisticasOfertas(input);
  if (statsOfertas) {
    ofertas = { ...statsOfertas, precoOfertadoEstimado: statsOfertas.precoM2Mediana * input.areaM2 };
  } else {
    avisos.push(`Amostra insuficiente de ofertas (Jetlar) para o bairro/tipo informado.`);
  }

  let indiceDesvio: number | null = null;
  let classificacao: Classificacao | null = null;
  if (vendas && ofertas) {
    indiceDesvio = (ofertas.precoOfertadoEstimado - vendas.precoJustoEstimado) / vendas.precoJustoEstimado;
    classificacao = classificar(indiceDesvio);
  }

  let avaliacaoPrecoDesejado: AvaliacaoPrecoDesejado | null = null;
  if (input.precoDesejado && vendas) {
    const indiceDesvioDesejado = (input.precoDesejado - vendas.precoJustoEstimado) / vendas.precoJustoEstimado;
    avaliacaoPrecoDesejado = {
      precoDesejado: input.precoDesejado,
      indiceDesvio: indiceDesvioDesejado,
      classificacao: classificar(indiceDesvioDesejado),
    };
  } else if (input.precoDesejado && !vendas) {
    avisos.push("Não foi possível avaliar o preço desejado: sem preço justo (ITBI) calculado para comparação.");
  }

  return { input, vendas, ofertas, indiceDesvio, classificacao, avaliacaoPrecoDesejado, avisos };
}
