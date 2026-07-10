// Amostra mínima para considerar uma média/mediana confiável o suficiente
// para reportar (abaixo disso, tentamos um nível de filtro mais amplo).
export const AMOSTRA_MINIMA = 3;

export function mediana(valores: number[]): number {
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  return ordenado.length % 2 !== 0 ? ordenado[meio] : (ordenado[meio - 1] + ordenado[meio]) / 2;
}

export function media(valores: number[]): number {
  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}
