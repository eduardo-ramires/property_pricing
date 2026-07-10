import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calcularPrecificacao } from '@/lib/pricing';

const Schema = z.object({
  tipo: z.enum(['APARTAMENTO', 'CASA', 'TERRENO', 'COMERCIAL'], {
    error: 'Tipo deve ser APARTAMENTO, CASA, TERRENO ou COMERCIAL',
  }),
  finalidade: z.enum(['VENDA', 'LOCACAO'], {
    error: 'Finalidade deve ser VENDA ou LOCACAO',
  }),
  cep: z
    .string()
    .regex(/^\d{8}$/, 'CEP deve conter exatamente 8 dígitos numéricos'),
  area_m2: z
    .number({ error: 'Área em m² é obrigatória' })
    .positive('Área deve ser maior que zero'),
  dormitorios: z.number().int().min(0).optional(),
  suites: z.number().int().min(0).optional(),
  banheiros: z.number().int().min(0).optional(),
  vagas_garagem: z.number().int().min(0).optional(),
  condicao: z.enum(['NOVO', 'BOM', 'REGULAR', 'RUIM']).optional(),
  mobilia: z.enum(['MOBILIADO', 'SEMI_MOBILIADO', 'SEM_MOBILIA']).optional(),
  orientacao_solar: z
    .enum(['NORTE', 'SUL', 'LESTE', 'OESTE', 'NORDESTE', 'NOROESTE', 'SUDESTE', 'SUDOESTE'])
    .optional(),
  posicao: z.enum(['FRENTE', 'FUNDOS', 'LATERAL', 'MEIO']).optional(),
  tipo_piso: z
    .enum(['PORCELANATO', 'CERAMICA', 'MADEIRA', 'VINILICO', 'MARMORE', 'GRANITO', 'OUTRO'])
    .optional(),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { erro: 'Corpo da requisição inválido. Envie JSON válido.' },
      { status: 400 },
    )
  }

  const resultado = Schema.safeParse(body)
  if (!resultado.success) {
    return NextResponse.json(
      { erro: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const precificacao = calcularPrecificacao(resultado.data)

  return NextResponse.json({
    entrada: resultado.data,
    precificacao,
  })
}