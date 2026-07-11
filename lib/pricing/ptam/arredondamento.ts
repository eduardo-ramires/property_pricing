export function arredondarMultiplo(valor: number, base: number): number {
  return Math.round(valor / base) * base;
}

/**
 * Arredonda para o múltiplo de R$ 1.000 mais próximo; se isso desviar mais de
 * 1% do valor bruto, usa múltiplo de R$ 100 (evita arredondar demais valores
 * pequenos ou "quebrados").
 */
export function arredondarValorAdotado(valorBruto: number): number {
  const candidatoMil = arredondarMultiplo(valorBruto, 1000);
  const desvioPct = Math.abs(candidatoMil - valorBruto) / valorBruto;
  return desvioPct > 0.01 ? arredondarMultiplo(valorBruto, 100) : candidatoMil;
}
