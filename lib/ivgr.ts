const SGS_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.21340/dados'

type SerieIVGR = Record<string, number> // 'YYYY-MM' → valor índice

let _cache: SerieIVGR | null = null
let _cacheTs = 0
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 h

export async function carregarSerieIVGR(): Promise<SerieIVGR> {
  if (_cache && Date.now() - _cacheTs < CACHE_TTL_MS) return _cache

  const res = await fetch(`${SGS_URL}?formato=json`, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`IVG-R SGS API retornou ${res.status}`)

  const dados: { data: string; valor: string }[] = await res.json()

  const serie: SerieIVGR = {}
  for (const { data, valor } of dados) {
    // data vem como "01/MM/YYYY" (dd/MM/yyyy)
    const parts = data.split('/')
    const chave = `${parts[2]}-${parts[1]}` // → 'YYYY-MM'
    serie[chave] = parseFloat(valor)
  }

  _cache = serie
  _cacheTs = Date.now()
  return serie
}

export function fatorAtualizacao(mesComparavel: string, serie: SerieIVGR): number {
  const meses = Object.keys(serie).sort()
  const mesAtual = meses.at(-1)!
  const valorAtual = serie[mesAtual]

  // Se o comparável for mais recente que o último mês disponível, Ft = 1
  if (mesComparavel >= mesAtual) return 1

  const valorComparavel = serie[mesComparavel]
  if (!valorComparavel) return 1 // mês não encontrado na série (muito antigo)

  return valorAtual / valorComparavel
}
