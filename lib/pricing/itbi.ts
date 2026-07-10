import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bairrosCorrespondem } from "./normalizar";
import { tipoCorrespondeAFinalidade } from "./tipos";
import { AMOSTRA_MINIMA, media, mediana } from "./estatisticas";

/**
 * Dados abertos de ITBI (Divisão da Receita Imobiliária de Porto Alegre).
 * Cobre apenas transações efetivamente pagas (data_pagamento preenchida) —
 * o campo "situacao" não corresponde de forma confiável ao enum documentado
 * no dicionário de dados, então usamos data_pagamento como critério de
 * "transação realizada".
 *
 * base_de_calculo é a base de cálculo da guia de ITBI, não o valor do
 * contrato particular — é o melhor proxy público disponível de preço de
 * venda para este dataset.
 *
 * As aspas simples nos campos de texto do CSV não são um escape real de
 * CSV (não há convenção documentada para apóstrofo dentro do valor, e
 * endereços com apóstrofo — ex: "D'Ouro" — aparecem sem qualquer escape).
 * Por isso o parsing é feito por split manual em ";" em vez de um parser
 * de CSV com aspas, que rejeita essas linhas como inválidas.
 */
const ARQUIVOS = ["itbi-2024.csv", "itbi-2025.csv", "itbi-2026.csv"];

const COLUNAS = [
  "data_estimativa",
  "data_pagamento",
  "base_de_calculo",
  "perc_transmitido",
  "finalidade_construcao",
  "logradouro",
  "n_endereco",
  "n_unidade",
  "complemento_endereco",
  "bairro",
  "cep",
  "area_total_terreno",
  "area_constr_total",
  "area_constr_privativa",
  "ano_construcao",
  "n_matricula_reg_imoveis",
  "n_zona_reg_imoveis",
  "situacao",
] as const;

function removerAspasSimples(campo: string): string {
  const valor = campo.trim();
  return valor.startsWith("'") && valor.endsWith("'") ? valor.slice(1, -1) : valor;
}

function parsearLinha(linha: string): Record<string, string> | null {
  const campos = linha.split(";");
  if (campos.length !== COLUNAS.length) return null;

  const registro: Record<string, string> = {};
  COLUNAS.forEach((coluna, indice) => {
    registro[coluna] = removerAspasSimples(campos[indice]);
  });
  return registro;
}

interface TransacaoItbi {
  bairro: string;
  finalidadeConstrucao: string;
  areaConstrPrivativa: number | null;
  areaConstrTotal: number | null;
  baseDeCalculo: number;
}

let transacoesCache: TransacaoItbi[] | null = null;

function numeroOuNull(valor: string | undefined): number | null {
  if (!valor || valor.trim() === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function carregarArquivo(nomeArquivo: string): TransacaoItbi[] {
  const caminho = join(process.cwd(), "dataset", nomeArquivo);
  const conteudo = readFileSync(caminho, "utf8");
  const linhas = conteudo.split("\n").slice(1); // pula o cabeçalho

  const registros: Record<string, string>[] = [];
  for (const linha of linhas) {
    if (!linha.trim()) continue;
    const registro = parsearLinha(linha);
    if (registro) registros.push(registro);
  }

  return registros
    .filter((registro) => registro.data_pagamento && registro.data_pagamento.trim() !== "")
    .map((registro) => ({
      bairro: registro.bairro ?? "",
      finalidadeConstrucao: registro.finalidade_construcao ?? "",
      areaConstrPrivativa: numeroOuNull(registro.area_constr_privativa),
      areaConstrTotal: numeroOuNull(registro.area_constr_total),
      baseDeCalculo: numeroOuNull(registro.base_de_calculo) ?? 0,
    }))
    .filter((transacao) => transacao.baseDeCalculo > 0 && areaUtilizavel(transacao) > 0);
}

function areaUtilizavel(transacao: TransacaoItbi): number {
  if (transacao.areaConstrPrivativa && transacao.areaConstrPrivativa > 0) {
    return transacao.areaConstrPrivativa;
  }
  return transacao.areaConstrTotal ?? 0;
}

function carregarTransacoes(): TransacaoItbi[] {
  if (!transacoesCache) {
    transacoesCache = ARQUIVOS.flatMap(carregarArquivo);
  }
  return transacoesCache;
}

export interface EstatisticasVendas {
  amostra: number;
  precoM2Mediana: number;
  precoM2Media: number;
  nivelFiltro: "bairro+tipo" | "bairro";
}

export function estatisticasVendas(bairro: string, tipo: string): EstatisticasVendas | null {
  const transacoes = carregarTransacoes();
  const doBairro = transacoes.filter((transacao) => bairrosCorrespondem(transacao.bairro, bairro));

  const tentativas: Array<{ nivel: EstatisticasVendas["nivelFiltro"]; itens: TransacaoItbi[] }> = [
    {
      nivel: "bairro+tipo",
      itens: doBairro.filter((transacao) => tipoCorrespondeAFinalidade(tipo, transacao.finalidadeConstrucao)),
    },
    { nivel: "bairro", itens: doBairro },
  ];

  for (const tentativa of tentativas) {
    const precosM2 = tentativa.itens.map((transacao) => transacao.baseDeCalculo / areaUtilizavel(transacao));

    if (precosM2.length >= AMOSTRA_MINIMA) {
      return {
        amostra: precosM2.length,
        precoM2Mediana: mediana(precosM2),
        precoM2Media: media(precosM2),
        nivelFiltro: tentativa.nivel,
      };
    }
  }

  return null;
}
