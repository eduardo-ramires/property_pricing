import { readFileSync } from 'fs'
import { join } from 'path'
import { carregarSerieIVGR, fatorAtualizacao } from './ivgr'

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
  ivgr_aplicado: boolean
}

interface RegistroITBI {
  cep: string
  cep_prefix: string  // primeiros 5 dígitos
  cep_suffix: number  // últimos 3 dígitos como inteiro (0-899); -1 se indisponível
  bairro: string
  tipo: string
  area_m2: number
  preco: number
  mes_referencia: string // 'YYYY-MM' — usado para fator IVG-R
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

function parseMesReferencia(dateStr: string): string {
  // Formato esperado: 'YYYY/MM/DD HH:MM:SS' → 'YYYY-MM'
  const trimmed = dateStr.trim()
  if (!trimmed) return ''
  return `${trimmed.slice(0, 4)}-${trimmed.slice(5, 7)}`
}

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

      // Sanity check sem IVG-R — exclui outliers brutos
      const preco_m2_bruto = preco / area
      if (preco_m2_bruto < 500 || preco_m2_bruto > 80000) continue

      // data_pagamento preferida; fallback para data_estimativa
      const mesReferencia = parseMesReferencia(cols[1]) || parseMesReferencia(cols[0])

      registros.push({
        cep,
        cep_prefix: cep.slice(0, 5),
        cep_suffix: cep.length >= 8 ? parseInt(cep.slice(5, 8), 10) : -1,
        bairro,
        tipo,
        area_m2: area,
        preco,
        mes_referencia: mesReferencia,
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
  cepSuffix: number,
  bairro: string,
): { registros: RegistroITBI[]; escopo: string } {
  // Tier 1: mesmo prefixo + sufixo ±50  (ex: CEP 90105-150 → 100 a 200)
  if (cepSuffix >= 0) {
    const rangeMin = Math.max(0, cepSuffix - 50)
    const rangeMax = Math.min(899, cepSuffix + 50)
    const rangeCurto = dados.filter(
      (r) =>
        r.cep_prefix === cepPrefix &&
        r.cep_suffix >= 0 &&
        r.cep_suffix >= rangeMin &&
        r.cep_suffix <= rangeMax &&
        tiposITBI.includes(r.tipo),
    )
    if (rangeCurto.length >= 5) return { registros: rangeCurto, escopo: 'cep_range_50' }
  }

  // Tier 2: mesmo prefixo, qualquer sufixo 000-899 (setor inteiro)
  const rangeCompleto = dados.filter(
    (r) => r.cep_prefix === cepPrefix && tiposITBI.includes(r.tipo),
  )
  if (rangeCompleto.length >= 5) return { registros: rangeCompleto, escopo: 'cep_setor' }

  // Tier 3: mesmo bairro + tipo
  if (bairro) {
    const porBairro = dados.filter(
      (r) => r.bairro === bairro && tiposITBI.includes(r.tipo),
    )
    if (porBairro.length >= 5) return { registros: porBairro, escopo: 'bairro' }
  }

  // Tier 4: cidade inteira + tipo (baixa confiança)
  const porTipo = dados.filter((r) => tiposITBI.includes(r.tipo))
  return { registros: porTipo, escopo: 'cidade' }
}

export async function calcularPrecificacao(dados: DadosImovel): Promise<ResultadoPrecificacao> {
  const registros = carregarDados()
  const tiposITBI = ITBI_TYPE_MAP[dados.tipo]
  const cepPrefix = dados.cep.slice(0, 5)
  const cepSuffix = dados.cep.length >= 8 ? parseInt(dados.cep.slice(5, 8), 10) : -1
  const bairro = encontrarBairro(registros, cepPrefix)

  const { registros: comparaveis, escopo } = filtrarComparaveis(
    registros,
    tiposITBI,
    cepPrefix,
    cepSuffix,
    bairro,
  )

  // Tenta carregar a série IVG-R; se falhar, segue sem atualização
  let serieIVGR: Record<string, number> | null = null
  try {
    serieIVGR = await carregarSerieIVGR()
  } catch {
    // API do Bacen indisponível — usa preços nominais
  }

  const precosMedioM2 = comparaveis.map((r) => {
    let ft = 1
    if (serieIVGR && r.mes_referencia) {
      ft = fatorAtualizacao(r.mes_referencia, serieIVGR)
    }
    return (r.preco * ft) / r.area_m2
  })

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
      ivgr_aplicado: false,
    }
  }

  const precoEstimado = Math.round(precoMedioM2 * dados.area_m2)

  const margem =
    escopo === 'cep_range_50' ? 0.10 :
    escopo === 'cep_setor'    ? 0.15 :
    escopo === 'bairro'       ? 0.20 :
    0.25 // cidade

  const confianca =
    comparaveis.length >= 10 && escopo === 'cep_range_50' ? 'ALTA' :
    comparaveis.length >= 5  && escopo === 'cep_range_50' ? 'MEDIA' :
    comparaveis.length >= 10 && escopo === 'cep_setor'    ? 'MEDIA' :
    comparaveis.length >= 5                               ? 'BAIXA' :
    'INSUFICIENTE'

  return {
    preco_estimado: precoEstimado,
    faixa_minima: Math.round(precoEstimado * (1 - margem)),
    faixa_maxima: Math.round(precoEstimado * (1 + margem)),
    preco_medio_m2: Math.round(precoMedioM2),
    comparaveis_utilizados: comparaveis.length,
    bairro_referencia: bairro || `prefixo CEP ${cepPrefix}`,
    confianca,
    ivgr_aplicado: serieIVGR !== null,
  }
}