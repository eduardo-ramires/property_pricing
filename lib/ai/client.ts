import OpenAI from "openai";

let client: OpenAI | null = null;

/**
 * Ainda não usado em nenhuma feature — só deixa o cliente pronto pra quando
 * formos integrar IA. Lança erro só quando alguém de fato tentar usar (não
 * na hora de importar o módulo), já que nem todo ambiente de dev tem
 * OPENAI_API_KEY configurada.
 */
export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada. Defina no .env para usar recursos de IA.");
  }
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}
