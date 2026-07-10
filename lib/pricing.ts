import { readFileSync } from 'fs'
import { join } from 'path'

export type TipoImovel = 'APARTAMENTO' | 'CASA' | 'TERRENO' | 'COMERCIAL'

export type Finalidade = 'VENDA' | 'LOCACAO'
export type Condicao = 'NOVO' | 'BOM' | 'REGULAR' | 'RUIM'
export type Mobilia = 'MOBILIADO' | 'SEMI_MOBILIADO' | 'SEM_MOBILIA'
export type OrientacaoSolar = 'NORTE' | 'SUL' | 'LESTE' | 'OESTE' | 'NORDESTE' | 'NOROESTE' | 'SUDESTE' | 'SUDOESTE'
export type Posicao = 'FRENTE' | 'FUNDOS' | 'LATERAL' | 'MEIO'
export type TipoPiso = 'PORCELANATO' | 'CERAMICA' | 'MADEIRA' | 'VINILICO' | 'MARMORE' | 'GRANITO' | 'OUTRO'

export interface DadosImovel {
  tipo: TipoImovel
  finalidade: Finalidade
  cep: string
  area_m2: number
  dormitorios?: number
  suites?: number
  banheiros?: number
  vagas_garagem?: number
  condicao?: Condicao
  mobilia?: Mobilia
  orientacao_solar?: OrientacaoSolar
  posicao?: Posicao
  tipo_piso?: TipoPiso
}

export interface ResultadoPrecificacao {
  preco_estimado: number
  faixa_minima: number
  faixa_maxima: number
  preco_medio_m2: number
  comparaveis_utilizados: number
  bairro_referencia: string
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA' | 'INSUFICIENTE'
}

interface RegistroITBI {
  cep: string
  cep_prefix: string
  bairro: string
  tipo: string
  area_m2: number
  preco: number
  preco_m2: number
}

const ITBI_TYPE_MAP: Record<TipoImovel, string[]> = {
  APARTAMENTO: ['APARTAMENTO', 'APARTAMENTO DE COBERTURA', 'APART-HOTEL(FLAT)'],
  CASA: [
    'RESIDENCIA ISOLADA',
    'RESIDENCIA PADRONIZADA EM COND HORIZONTAL FECHADO',
    'RESIDENCIA CONDOM HORIZ ABERTO SEM AREA USO COMUM',
    'RESIDENCIA NAO PADRONIZ EM CONDOM HORIZONTAL FECHADO',
    'RESIDENCIA DE FRENTE COM INTERIORES',
    'RESIDENCIA DE INTERIOR',
  ],
  COMERCIAL: [
    'SALA COMERCIAL',
    'UNIDADE DE COMERCIO E SERVICO ISOLADA',
    'LOJA TERREA EM EDIFICIO',
    'LOJA EM GALERIA',
    'UNIDADE (DE COMÉRCIO OU SERVIÇOS) DE  FRENTE NÃO ISOLADA',
    'LOJA TERREA ISOLADA',
  ],
  TERRENO: ['CONSTRUCAO EM AREA PROJETADA DE GLEBA', 'TERRENO'],
}

// In-process cache — populated once per server lifecycle
let _cache: RegistroITBI[] | null = null

function carregarDados(): RegistroITBI[] {
  if (_cache) return _cache

  const arquivos = ['itbi-2026.csv', 'itbi-2025.csv', 'itbi-2024.csv']
  const registros: RegistroITBI[] = []

  for (const arquivo of arquivos) {
    const caminho = join(process.cwd(), 'dataset', arquivo)
    const linhas = readFileSync(caminho, 'utf-8').split('\n')

    // header index:
    // 0:data_estimativa 1:data_pagamento 2:base_de_calculo 3:perc_transmitido
    // 4:finalidade_construcao 5:logradouro 6:n_endereco 7:n_unidade
    // 8:complemento_endereco 9:bairro 10:cep 11:area_total_terreno
    // 12:area_constr_total 13:area_constr_privativa 14:ano_construcao ...
    for (let i = 1; i < linhas.length; i++) {
      const cols = linhas[i].split(';')
      if (cols.length < 15) continue

      const preco = parseFloat(cols[2])
      const area = parseFloat(cols[12])
      const cep = cols[10]?.trim().replace(/\D/g, '')
      const bairro = cols[9]?.replace(/'/g, '').trim()
      const tipo = cols[4]?.replace(/'/g, '').trim()

      if (!preco || !area || area < 10 || !cep || cep.length < 5) continue

      const preco_m2 = preco / area
      if (preco_m2 < 500 || preco_m2 > 80000) continue

      registros.push({
        cep,
        cep_prefix: cep.slice(0, 5),
        bairro,
        tipo,
        area_m2: area,
        preco,
        preco_m2,
      })
    }
  }

  _cache = registros
  return registros
}

function mediana(valores: number[]): number {
  if (!valores.length) return 0
  const ordenados = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(ordenados.length / 2)
  return ordenados.length % 2 === 0
    ? (ordenados[meio - 1] + ordenados[meio]) / 2
    : ordenados[meio]
}

function encontrarBairro(dados: RegistroITBI[], cepPrefix: string): string {
  const registro = dados.find((r) => r.cep_prefix === cepPrefix)
  return registro?.bairro ?? ''
}

function filtrarComparaveis(
  dados: RegistroITBI[],
  tiposITBI: string[],
  cepPrefix: string,
  bairro: string,
): { registros: RegistroITBI[]; escopo: string } {
  // Tier 1: mesmo CEP (5 dígitos) + tipo
  const porCep = dados.filter(
    (r) => r.cep_prefix === cepPrefix && tiposITBI.includes(r.tipo),
  )
  if (porCep.length >= 10) return { registros: porCep, escopo: 'cep' }

  // Tier 2: mesmo bairro + tipo
  if (bairro) {
    const porBairro = dados.filter(
      (r) => r.bairro === bairro && tiposITBI.includes(r.tipo),
    )
    if (porBairro.length >= 5) return { registros: porBairro, escopo: 'bairro' }
  }

  // Tier 3: cidade inteira + tipo (baixa confiança)
  const porTipo = dados.filter((r) => tiposITBI.includes(r.tipo))
  return { registros: porTipo, escopo: 'cidade' }
}

export function calcularPrecificacao(dados: DadosImovel): ResultadoPrecificacao {
  const registros = carregarDados()
  const tiposITBI = ITBI_TYPE_MAP[dados.tipo]
  const cepPrefix = dados.cep.slice(0, 5)
  const bairro = encontrarBairro(registros, cepPrefix)

  const { registros: comparaveis, escopo } = filtrarComparaveis(
    registros,
    tiposITBI,
    cepPrefix,
    bairro,
  )

  const precosMedioM2 = comparaveis.map((r) => r.preco_m2)
  const precoMedioM2 = mediana(precosMedioM2)

  if (!precoMedioM2 || comparaveis.length === 0) {
    return {
      preco_estimado: 0,
      faixa_minima: 0,
      faixa_maxima: 0,
      preco_medio_m2: 0,
      comparaveis_utilizados: 0,
      bairro_referencia: bairro,
      confianca: 'INSUFICIENTE',
    }
  }

  const precoEstimado = Math.round(precoMedioM2 * dados.area_m2)
  const margem = escopo === 'cep' ? 0.1 : escopo === 'bairro' ? 0.15 : 0.25

  const confianca =
    comparaveis.length >= 30 && escopo === 'cep'
      ? 'ALTA'
      : comparaveis.length >= 10 && escopo !== 'cidade'
        ? 'MEDIA'
        : comparaveis.length >= 5
          ? 'BAIXA'
          : 'INSUFICIENTE'

  return {
    preco_estimado: precoEstimado,
    faixa_minima: Math.round(precoEstimado * (1 - margem)),
    faixa_maxima: Math.round(precoEstimado * (1 + margem)),
    preco_medio_m2: Math.round(precoMedioM2),
    comparaveis_utilizados: comparaveis.length,
    bairro_referencia: bairro || `prefixo CEP ${cepPrefix}`,
    confianca,
  }
}