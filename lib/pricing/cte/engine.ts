import type { CdiResult } from './cdi_provider'

const HORIZONTES = [6, 12, 18] as const

export interface CteInput {
  vd: number
  vp?: number
  condominioMensal: number
  iptuMensal: number
  taxaMensal: number
}

export interface CteCenario {
  tMeses: number
  cft: number
  co: number
  cte: number
  valorFuturoInvestido: number
  posicaoComparativa: number
  veredicto?: 'COMPENSA_ESPERAR' | 'NAO_COMPENSA'
  frase: string
}

export interface CteComparativo {
  ganhoPretendido: number
  breakevenMeses: number | null
  veredictoGeral: 'BREAKEVEN_ENCONTRADO' | 'GANHO_SUPERA_HORIZONTE' | 'SEM_GANHO_A_PERSEGUIR'
  frase: string
}

export interface CteOutput {
  taxa: CdiResult
  baseCo: { tipo: 'vd' | 'vp'; valor: number }
  cenarios: CteCenario[]
  comparativo?: CteComparativo
  disclaimers: string[]
}

function fmt(v: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)
}

function calcularBreakeven(
  ganhoPretendido: number,
  custoMensalFixo: number,
  vd: number,
  taxaMensal: number,
): number | null {
  const cte = (t: number) => custoMensalFixo * t + vd * (Math.pow(1 + taxaMensal, t) - 1)
  if (cte(60) < ganhoPretendido) return null
  let lo = 0,
    hi = 60
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2
    if (cte(mid) >= ganhoPretendido) hi = mid
    else lo = mid
    if (hi - lo < 0.05) break
  }
  return Math.round(((lo + hi) / 2) * 10) / 10
}

export function calcularCte(input: CteInput, cdi: CdiResult): CteOutput {
  const { vd, vp, condominioMensal, iptuMensal, taxaMensal } = input
  const custoMensalFixo = condominioMensal + iptuMensal

  const cenarios: CteCenario[] = HORIZONTES.map((t) => {
    const cft = Math.round(custoMensalFixo * t)
    const co = Math.round(vd * (Math.pow(1 + taxaMensal, t) - 1))
    const cte = cft + co
    const valorFuturoInvestido = Math.round(vd * Math.pow(1 + taxaMensal, t))
    const posicaoComparativa = vd + cte

    const frase = `Esperar ${t} meses custa ${fmt(cte)} (${fmt(cft)} de condomínio/IPTU + ${fmt(co)} de rendimento não capturado).`

    let veredicto: 'COMPENSA_ESPERAR' | 'NAO_COMPENSA' | undefined
    if (vp !== undefined && vp < vd) {
      veredicto = cte < vd - vp ? 'COMPENSA_ESPERAR' : 'NAO_COMPENSA'
    }

    return { tMeses: t, cft, co, cte, valorFuturoInvestido, posicaoComparativa, veredicto, frase }
  })

  let comparativo: CteComparativo | undefined
  if (vp !== undefined) {
    if (vp >= vd) {
      comparativo = {
        ganhoPretendido: 0,
        breakevenMeses: null,
        veredictoGeral: 'SEM_GANHO_A_PERSEGUIR',
        frase: 'O valor PTAM já é igual ou superior ao valor desejado — não há ganho financeiro a perseguir esperando.',
      }
    } else {
      const ganhoPretendido = Math.round(vd - vp)
      const breakevenMeses = calcularBreakeven(ganhoPretendido, custoMensalFixo, vd, taxaMensal)
      comparativo = {
        ganhoPretendido,
        breakevenMeses,
        veredictoGeral: breakevenMeses === null ? 'GANHO_SUPERA_HORIZONTE' : 'BREAKEVEN_ENCONTRADO',
        frase:
          breakevenMeses === null
            ? `O ganho pretendido de ${fmt(ganhoPretendido)} supera o custo da espera mesmo em 60 meses.`
            : `O ganho pretendido de ${fmt(ganhoPretendido)} deixa de compensar a partir de ~${breakevenMeses} meses de espera.`,
      }
    }
  }

  return {
    taxa: cdi,
    baseCo: { tipo: 'vd', valor: vd },
    cenarios,
    comparativo,
    disclaimers: [
      'Valores estimados para comparação de custos da decisão de venda; não constituem recomendação de investimento.',
      'Taxa CDI bruta, sem desconto de imposto de renda.',
    ],
  }
}