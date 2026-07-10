import { z } from "zod";

export const ESTADOS_CONSERVACAO = ["novo", "bom", "regular", "reparos_simples"] as const;
export const PADROES_CONSTRUTIVOS = ["baixo", "normal", "alto"] as const;

export const precificacaoInputSchema = z.object({
  cidade: z.string().trim().min(1, "cidade é obrigatória"),
  bairro: z.string().trim().min(1, "bairro é obrigatório"),
  tipo: z.string().trim().min(1, "tipo é obrigatório"),
  areaM2: z.number().positive("areaM2 deve ser maior que zero"),
  quartos: z.number().int().nonnegative(),
  vagas: z.number().int().nonnegative().optional(),
  mobiliado: z.boolean().optional(),
  estadoConservacao: z.enum(ESTADOS_CONSERVACAO).optional(),
  padraoConstrutivo: z.enum(PADROES_CONSTRUTIVOS).optional(),
  precoDesejado: z.number().positive("precoDesejado deve ser maior que zero").optional(),
});

export type PrecificacaoInput = z.infer<typeof precificacaoInputSchema>;
