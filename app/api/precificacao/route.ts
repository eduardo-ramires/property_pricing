import { NextRequest, NextResponse } from "next/server";
import { precificacaoInputSchema } from "@/lib/validators/precificacao";
import { calcularPrecificacao } from "@/lib/pricing/indice";

export async function POST(request: NextRequest) {
  const corpo = await request.json().catch(() => null);
  if (!corpo) {
    return NextResponse.json({ erro: "Corpo da requisição inválido (esperado JSON)." }, { status: 400 });
  }

  const entrada = precificacaoInputSchema.safeParse(corpo);
  if (!entrada.success) {
    return NextResponse.json({ erro: "Dados inválidos.", detalhes: entrada.error.flatten() }, { status: 400 });
  }

  const resultado = calcularPrecificacao(entrada.data);
  return NextResponse.json(resultado);
}
