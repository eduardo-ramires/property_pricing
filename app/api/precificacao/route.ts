import { NextRequest, NextResponse } from 'next/server'
import { precificacaoInputSchema } from '@/lib/validators/precificacao'
import { calcularPrecificacao } from '@/lib/pricing/indice'
import { fetchCdi } from '@/lib/pricing/cte/cdi_provider'
import { calcularCte } from '@/lib/pricing/cte/engine'

export async function POST(request: NextRequest) {
  const corpo = await request.json().catch(() => null)
  if (!corpo) {
    return NextResponse.json({ erro: 'Corpo da requisição inválido (esperado JSON).' }, { status: 400 })
  }

  const entrada = precificacaoInputSchema.safeParse(corpo)
  if (!entrada.success) {
    return NextResponse.json({ erro: 'Dados inválidos.', detalhes: entrada.error.flatten() }, { status: 400 })
  }

  const ptam = calcularPrecificacao(entrada.data)

  const temCustos = (entrada.data.condominioMensal ?? 0) > 0 || (entrada.data.iptuAnual ?? 0) > 0
  const vd = entrada.data.precoDesejado ?? ptam.resultado.valorAdotado ?? null
  let cte = null

  if (temCustos && vd !== null) {
    const cdi = await fetchCdi()
    cte = calcularCte(
      {
        vd,
        vp: ptam.resultado.valorAdotado ?? undefined,
        condominioMensal: entrada.data.condominioMensal ?? 0,
        iptuMensal: (entrada.data.iptuAnual ?? 0) / 12,
        taxaMensal: cdi.taxaMensal,
      },
      cdi,
    )
  }

  return NextResponse.json({ ...ptam, cte })
}