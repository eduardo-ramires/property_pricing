import { z } from "zod";

export const precificacaoInputSchema = z.object({
  cidade: z.string().trim().min(1, "cidade é obrigatória"),
  bairro: z.string().trim().min(1, "bairro é obrigatório"),
  tipo: z.string().trim().min(1, "tipo é obrigatório"),
  areaM2: z.number().positive("areaM2 deve ser maior que zero"),
  quartos: z.number().int().nonnegative(),
  mobiliado: z.boolean(),
});

export type PrecificacaoInput = z.infer<typeof precificacaoInputSchema>;
