import { media } from "../estatisticas.ts";

export { media };

export function desvioPadraoAmostral(valores: number[]): number {
  if (valores.length < 2) return 0;
  const m = media(valores);
  const somaQuadrados = valores.reduce((acumulado, valor) => acumulado + (valor - m) ** 2, 0);
  return Math.sqrt(somaQuadrados / (valores.length - 1));
}

export function coeficienteVariacao(valores: number[]): number {
  const m = media(valores);
  if (m === 0) return 0;
  return desvioPadraoAmostral(valores) / m;
}
