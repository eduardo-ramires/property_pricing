import { z } from "zod";

export const ESTADOS_CONSERVACAO = ["novo", "bom", "regular", "reparos_simples"] as const;
export const PADROES_CONSTRUTIVOS = ["baixo", "normal", "alto"] as const;

export const precificacaoInputSchema = z.object({
  cidade: z.string().trim().min(1, "cidade é obrigatória"),
  bairro: z.string().trim().min(1, "bairro é obrigatório"),
  tipo: z.string().trim().min(1, "tipo é obrigatório"),
  areaM2: z.number().positive("areaM2 deve ser maior que zero"),
  // Informativos — a metodologia PTAM (NBR 14.653-2) homogeneiza por área e
  // vaga, não por quartos/banheiros/suítes/mobília. Não entram no cálculo.
  quartos: z.number().int().nonnegative().optional(),
  vagas: z.number().int().nonnegative().optional(),
  banheiros: z.number().int().nonnegative().optional(),
  suites: z.number().int().nonnegative().optional(),
  mobiliado: z.boolean().optional(),
  estadoConservacao: z.enum(ESTADOS_CONSERVACAO, { error: "estadoConservacao é obrigatório" }),
  padraoConstrutivo: z.enum(PADROES_CONSTRUTIVOS, { error: "padraoConstrutivo é obrigatório" }),
  precoDesejado: z.number().positive("precoDesejado deve ser maior que zero").optional(),
});

export type PrecificacaoInput = z.infer<typeof precificacaoInputSchema>;
