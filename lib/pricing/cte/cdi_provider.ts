const SGS_URL =
  'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json'
const CDI_FALLBACK_AA = 14.65
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

let cache: { valor: number; data: string; fetchedAt: number } | null = null

export interface CdiResult {
  cdiAa: number
  taxaMensal: number
  fonte: 'sgs' | 'cache' | 'fallback_config'
  dataReferencia: string
}

function toTaxaMensal(cdiAa: number): number {
  return Math.pow(1 + cdiAa / 100, 1 / 12) - 1
}

export async function fetchCdi(): Promise<CdiResult> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return {
      cdiAa: cache.valor,
      taxaMensal: toTaxaMensal(cache.valor),
      fonte: 'cache',
      dataReferencia: cache.data,
    }
  }

  try {
    const res = await fetch(SGS_URL, { next: { revalidate: 86400 } })
    if (!res.ok) throw new Error(`SGS retornou ${res.status}`)
    const json = (await res.json()) as [{ data: string; valor: string }]
    const cdiAa = parseFloat(json[0].valor)
    const dataReferencia = json[0].data
    cache = { valor: cdiAa, data: dataReferencia, fetchedAt: Date.now() }
    return { cdiAa, taxaMensal: toTaxaMensal(cdiAa), fonte: 'sgs', dataReferencia }
  } catch {
    if (cache) {
      console.warn('[cdi_provider] API SGS falhou; usando cache antigo')
      return {
        cdiAa: cache.valor,
        taxaMensal: toTaxaMensal(cache.valor),
        fonte: 'cache',
        dataReferencia: cache.data,
      }
    }
    console.warn('[cdi_provider] API SGS e cache falhos; usando fallback_config')
    return {
      cdiAa: CDI_FALLBACK_AA,
      taxaMensal: toTaxaMensal(CDI_FALLBACK_AA),
      fonte: 'fallback_config',
      dataReferencia: new Date().toLocaleDateString('pt-BR'),
    }
  }
}