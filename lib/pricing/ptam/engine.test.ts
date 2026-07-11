import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularValorPtam } from "./engine.ts";
import type { EntradaPtam } from "./tipos.ts";

// Caso do documento-fonte (Critérios e Fórmula de Precificação de Imóveis —
// PTAM). Os comparáveis TÊM estado_conservacao/padrao_construtivo próprios,
// então o motor homogeneiza por comparável de verdade (Fc/Fp reais) — este
// teste valida o motor puro, sem o ajuste agregado de ajusteAgregado.ts
// (que só se aplica quando o comparável não tem esse dado).
const ENTRADA_GOLDEN: EntradaPtam = {
  parametros: { fatorOferta: 0.9, valorVaga: 35000, expoenteArea: 0.125 },
  avaliando: { areaM2: 60, padraoConstrutivo: "normal", estadoConservacao: "bom", possuiVaga: false },
  comparaveis: [
    {
      id: "1",
      areaM2: 65,
      estadoConservacao: "bom",
      padraoConstrutivo: "normal",
      possuiVaga: false,
      precoAnuncio: 371000,
      fatorLocalizacao: 1.0,
      tipo: "oferta",
    },
    {
      id: "2",
      areaM2: 55,
      estadoConservacao: "regular",
      padraoConstrutivo: "normal",
      possuiVaga: false,
      precoAnuncio: 300000,
      fatorLocalizacao: 0.95,
      tipo: "oferta",
    },
    {
      id: "3",
      areaM2: 70,
      estadoConservacao: "bom",
      padraoConstrutivo: "normal",
      possuiVaga: true,
      precoAnuncio: 434000,
      fatorLocalizacao: 1.0,
      tipo: "oferta",
    },
    {
      id: "4",
      areaM2: 60,
      estadoConservacao: "bom",
      padraoConstrutivo: "normal",
      possuiVaga: false,
      precoAnuncio: 336000,
      fatorLocalizacao: 1.0,
      tipo: "oferta",
    },
    {
      id: "5",
      areaM2: 58,
      estadoConservacao: "regular",
      padraoConstrutivo: "normal",
      possuiVaga: false,
      precoAnuncio: 264000,
      fatorLocalizacao: 1.05,
      tipo: "oferta",
    },
  ],
};

function proximo(valor: number, esperado: number, tolerancia: number) {
  assert.ok(
    Math.abs(valor - esperado) <= tolerancia,
    `esperado ${esperado} (±${tolerancia}), recebido ${valor}`,
  );
}

test("golden test — caso do documento-fonte", () => {
  const resultado = calcularValorPtam(ENTRADA_GOLDEN);

  assert.equal(resultado.rejeitados.length, 0);
  assert.equal(resultado.descartadosOutlier.length, 0);
  assert.equal(resultado.nComparaveisUtilizados, 5);

  const vuhEsperados = [5188.58, 4877.33, 5229.81, 5040.0, 4506.69];
  resultado.memoriaCalculo.forEach((item, i) => proximo(item.vuh, vuhEsperados[i], 0.5));

  proximo(resultado.estatisticas.vuMedio ?? NaN, 4968.48, 0.5);
  proximo(resultado.estatisticas.desvioPadrao ?? NaN, 293.0, 1.0);
  proximo(resultado.estatisticas.cvPercentual ?? NaN, 5.9, 0.1);

  proximo(resultado.resultado.valorBruto ?? NaN, 298108.8, 60);
  assert.equal(resultado.resultado.valorAdotado, 298000);
  assert.equal(resultado.resultado.intervaloMin, 283000);
  assert.equal(resultado.resultado.intervaloMax, 313000);
  assert.equal(resultado.resultado.campoArbitrioMin, 253000);
  assert.equal(resultado.resultado.campoArbitrioMax, 343000);

  assert.equal(resultado.status, "alerta");
  assert.ok(resultado.alertas.some((a) => a.includes("AMOSTRA_MINIMA")));
});

test("rejeita comparável com área fora de ±30%", () => {
  const entrada: EntradaPtam = {
    ...ENTRADA_GOLDEN,
    comparaveis: [
      ...ENTRADA_GOLDEN.comparaveis,
      {
        id: "6",
        areaM2: 90, // 60 * 1.5 — 50% acima do avaliando
        precoAnuncio: 500000,
        tipo: "oferta",
      },
    ],
  };
  const resultado = calcularValorPtam(entrada);
  assert.ok(resultado.rejeitados.some((r) => r.id === "6" && r.motivo === "AREA_FORA_30PCT"));
});

test("status erro quando sobram menos de 3 comparáveis", () => {
  const entrada: EntradaPtam = {
    ...ENTRADA_GOLDEN,
    comparaveis: ENTRADA_GOLDEN.comparaveis.slice(0, 2),
  };
  const resultado = calcularValorPtam(entrada);
  assert.equal(resultado.status, "erro");
  assert.equal(resultado.motivoErro, "AMOSTRA_INSUFICIENTE");
  assert.equal(resultado.resultado.valorAdotado, null);
});

test("Fo = 1.00 para comparável tipo transação", () => {
  const entrada: EntradaPtam = {
    ...ENTRADA_GOLDEN,
    comparaveis: ENTRADA_GOLDEN.comparaveis.map((c, i) => (i === 0 ? { ...c, tipo: "transacao" as const } : c)),
  };
  const resultado = calcularValorPtam(entrada);
  // vu_pos_oferta do comparável 1 sem o fator 0.90 deveria ser maior que no golden test
  const item = resultado.memoriaCalculo.find((m) => m.id === "1");
  assert.ok(item);
  assert.ok(item!.vuh > 5188.58);
});

test("tratamento de vaga — comparável com vaga, avaliando sem", () => {
  const resultado = calcularValorPtam(ENTRADA_GOLDEN);
  const item = resultado.memoriaCalculo.find((m) => m.id === "3");
  assert.ok(item);
  // preco_tratado deve ser 434000 - 35000 = 399000
  assert.equal(item!.precoTratado, 399000);
});

test("idempotência — mesmo input duas vezes dá o mesmo output", () => {
  const r1 = calcularValorPtam(ENTRADA_GOLDEN);
  const r2 = calcularValorPtam(ENTRADA_GOLDEN);
  assert.deepEqual(r1, r2);
});
