/**
 * Bairros do ITBI vêm em maiúsculo, sem acento, e às vezes truncados (ex:
 * "BOA VISTA DO SU" para "Boa Vista do Sul" — truncamento do sistema de
 * origem). Por isso a comparação de bairro usa prefixo em vez de igualdade.
 */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

export function bairrosCorrespondem(bairroA: string, bairroB: string): boolean {
  const a = normalizarTexto(bairroA);
  const b = normalizarTexto(bairroB);
  // "".startsWith(qualquerCoisa) é sempre true em JS — sem essa guarda, uma
  // linha com bairro vazio (dado malformado no ITBI) "bateria" com qualquer
  // busca de bairro.
  if (a === "" || b === "") return false;
  return a === b || a.startsWith(b) || b.startsWith(a);
}
