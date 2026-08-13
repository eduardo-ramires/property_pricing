'use client'

import { useState } from 'react'

type Tipo = 'APARTAMENTO' | 'CASA' | 'CHACARA' | 'COBERTURA' | 'SALA_COMERCIAL' | 'LOJA' | 'TERRENO'
type EstadoConservacao = 'NOVO' | 'BOM' | 'REGULAR' | 'REPAROS_SIMPLES'
type PadraoConstrutivo = 'BAIXO' | 'NORMAL' | 'ALTO'
type Classificacao = 'abaixo_do_mercado' | 'dentro_do_mercado' | 'acima_do_mercado'

interface FormState {
  tipo: Tipo | ''
  cep: string
  area_m2: string
  preco_desejado: string
  quartos: string
  vaga_garagem: string
  banheiros: string
  suites: string
  estado_conservacao: EstadoConservacao | ''
  padrao_construtivo: PadraoConstrutivo | ''
  condominio_mensal: string
  iptu_anual: string
}

interface MemoriaCalculoItem {
  id: string
  titulo?: string
  url?: string
  precoTratado: number
  vu: number
  vuPosOferta: number
  fa: number
  fl: number
  fp: number
  fc: number
  somaAditiva: number
  vuh: number
}

interface Rejeitado {
  id: string
  motivo: string
}

interface AvaliacaoPrecoDesejado {
  precoDesejado: number
  indiceDesvio: number
  classificacao: Classificacao
}

interface CteCenario {
  tMeses: number
  cft: number
  co: number
  cte: number
  valorFuturoInvestido: number
  posicaoComparativa: number
  veredicto?: 'COMPENSA_ESPERAR' | 'NAO_COMPENSA'
  frase: string
}

interface CteComparativo {
  ganhoPretendido: number
  breakevenMeses: number | null
  veredictoGeral: 'BREAKEVEN_ENCONTRADO' | 'GANHO_SUPERA_HORIZONTE' | 'SEM_GANHO_A_PERSEGUIR'
  frase: string
}

interface CteResult {
  taxa: { cdiAa: number; taxaMensal: number; fonte: string; dataReferencia: string }
  baseCo: { tipo: 'vd' | 'vp'; valor: number }
  cenarios: CteCenario[]
  comparativo?: CteComparativo
  disclaimers: string[]
}

interface ResultadoPrecificacao {
  status: 'ok' | 'alerta' | 'erro'
  alertas: string[]
  motivoErro: string | null
  nComparaveisUtilizados: number
  rejeitados: Rejeitado[]
  descartadosOutlier: string[]
  memoriaCalculo: MemoriaCalculoItem[]
  estatisticas: {
    vuMedio: number | null
    desvioPadrao: number | null
    cvPercentual: number | null
  }
  resultado: {
    valorBruto: number | null
    valorAdotado: number | null
    intervaloMin: number | null
    intervaloMax: number | null
    campoArbitrioMin: number | null
    campoArbitrioMax: number | null
  }
  ruleVersion: string
  avaliacaoPrecoDesejado: AvaliacaoPrecoDesejado | null
  avisos: string[]
  cte: CteResult | null
}

const MOTIVO_ERRO_LABEL: Record<string, string> = {
  AMOSTRA_INSUFICIENTE:
    'Não há comparáveis suficientes (mínimo 3) para esse bairro/tipo depois dos filtros de área e consistência. Tente um CEP vizinho.',
}

const TIPOS: Tipo[] = ['APARTAMENTO', 'CASA', 'CHACARA', 'COBERTURA', 'SALA_COMERCIAL', 'LOJA', 'TERRENO']

// Também é o texto enviado ao serviço (vocabulário do RGI/ITBI, normalizado internamente).
const TIPO_LABEL: Record<Tipo, string> = {
  APARTAMENTO: 'Apartamento',
  CASA: 'Casa',
  CHACARA: 'Chácara',
  COBERTURA: 'Cobertura',
  SALA_COMERCIAL: 'Sala Comercial',
  LOJA: 'Loja',
  TERRENO: 'Terreno',
}

// Escala Heidecke simplificada — deprecia o valor de venda conforme o estado
// de conservação real do imóvel (os comparáveis não têm esse dado
// individual, então o ajuste entra uma vez no agregado final).
const ESTADO_CONSERVACAO_OPCOES: { valor: EstadoConservacao; label: string; fator: string; servico: string }[] = [
  { valor: 'NOVO', label: 'Novo', fator: '1,00', servico: 'novo' },
  { valor: 'BOM', label: 'Bom', fator: '0,97', servico: 'bom' },
  { valor: 'REGULAR', label: 'Regular', fator: '0,92', servico: 'regular' },
  { valor: 'REPAROS_SIMPLES', label: 'Reparos simples', fator: '0,82', servico: 'reparos_simples' },
]

const PADRAO_CONSTRUTIVO_OPCOES: { valor: PadraoConstrutivo; label: string; fator: string; servico: string }[] = [
  { valor: 'BAIXO', label: 'Baixo', fator: '0,90', servico: 'baixo' },
  { valor: 'NORMAL', label: 'Normal', fator: '1,00', servico: 'normal' },
  { valor: 'ALTO', label: 'Alto', fator: '1,10', servico: 'alto' },
]

const CLASSIFICACAO_CONFIG: Record<Classificacao, { label: string; badge: string; dot: string }> = {
  abaixo_do_mercado: { label: 'Abaixo do mercado', badge: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  dentro_do_mercado: { label: 'Dentro do mercado', badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  acima_do_mercado: { label: 'Acima do mercado', badge: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

function maskCep(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

interface EnderecoViaCep {
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

/**
 * Nosso serviço de precificação (bairro+cidade) precisa de mais contexto
 * geográfico do que um CEP isolado, então resolvemos o CEP pra bairro/cidade
 * via ViaCEP (API pública, sem chave) antes de chamar /api/precificacao.
 */
async function buscarEnderecoPorCep(cepLimpo: string): Promise<EnderecoViaCep> {
  const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
  if (!res.ok) throw new Error('Não foi possível consultar o CEP.')
  return res.json()
}

const EMPTY_FORM: FormState = {
  tipo: '',
  cep: '',
  area_m2: '',
  preco_desejado: '',
  quartos: '',
  vaga_garagem: '',
  banheiros: '',
  suites: '',
  estado_conservacao: '',
  padrao_construtivo: '',
  condominio_mensal: '',
  iptu_anual: '',
}

export default function PrecificarPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<ResultadoPrecificacao | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => {
      const n = { ...prev }
      delete n[key]
      return n
    })
  }

  function validateStep0() {
    const errs: Record<string, string> = {}
    if (!form.tipo) errs.tipo = 'Tipo do imóvel é obrigatório'
    if (form.cep.replace(/\D/g, '').length !== 8) errs.cep = 'CEP deve conter exatamente 8 dígitos'
    if (!form.area_m2 || parseFloat(form.area_m2) <= 0) errs.area_m2 = 'Área deve ser maior que zero'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep1() {
    const errs: Record<string, string> = {}
    if (!form.estado_conservacao) errs.estado_conservacao = 'Informe o estado de conservação'
    if (!form.padrao_construtivo) errs.padrao_construtivo = 'Informe o padrão construtivo'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleNext() {
    if (validateStep0()) setStep(1)
  }

  function handleBack() {
    setStep(0)
    setResultado(null)
    setApiError(null)
  }

  async function handleSubmit() {
    if (!validateStep1()) return

    setLoading(true)
    setApiError(null)
    setResultado(null)

    try {
      const cepLimpo = form.cep.replace(/\D/g, '')
      const endereco = await buscarEnderecoPorCep(cepLimpo)

      if (endereco.erro || !endereco.bairro) {
        setFieldErrors((prev) => ({ ...prev, cep: 'CEP não encontrado ou sem bairro cadastrado' }))
        setApiError('Não conseguimos localizar o bairro a partir desse CEP.')
        setStep(0)
        return
      }

      const estadoConservacao = ESTADO_CONSERVACAO_OPCOES.find((o) => o.valor === form.estado_conservacao)
      const padraoConstrutivo = PADRAO_CONSTRUTIVO_OPCOES.find((o) => o.valor === form.padrao_construtivo)

      const payload = {
        cidade: endereco.localidade,
        bairro: endereco.bairro,
        tipo: TIPO_LABEL[form.tipo as Tipo],
        areaM2: parseFloat(form.area_m2),
        estadoConservacao: estadoConservacao?.servico,
        padraoConstrutivo: padraoConstrutivo?.servico,
        ...(form.quartos ? { quartos: parseInt(form.quartos, 10) } : {}),
        ...(form.vaga_garagem ? { vagas: parseInt(form.vaga_garagem, 10) } : {}),
        ...(form.banheiros ? { banheiros: parseInt(form.banheiros, 10) } : {}),
        ...(form.suites ? { suites: parseInt(form.suites, 10) } : {}),
        ...(form.preco_desejado ? { precoDesejado: parseFloat(form.preco_desejado) } : {}),
        ...(form.condominio_mensal ? { condominioMensal: parseFloat(form.condominio_mensal) } : {}),
        ...(form.iptu_anual ? { iptuAnual: parseFloat(form.iptu_anual) } : {}),
      }

      const res = await fetch('/api/precificacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        setApiError(data.erro ?? 'Erro ao calcular precificação')
      } else {
        setResultado(data as ResultadoPrecificacao)
      }
    } catch {
      setApiError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleNovaPrecificacao() {
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setResultado(null)
    setApiError(null)
    setStep(0)
  }

  const inputClass = (hasError?: boolean) =>
    `w-full h-9 px-3 text-sm rounded border bg-white text-[#111827] placeholder:text-[#9ca3af]
    focus:outline-none focus:ring-1 focus:ring-[#284670] focus:border-[#284670] transition-colors
    disabled:bg-[#f3f4f6] disabled:text-[#9ca3af] disabled:cursor-not-allowed
    ${hasError ? 'border-red-400' : 'border-[#e5e7eb]'}`

  const pillBtn = (active: boolean) =>
    `px-3 py-2 text-xs font-medium rounded border transition-colors ${
      active
        ? 'bg-[#284670] text-white border-[#284670]'
        : 'bg-white text-[#374151] border-[#e5e7eb] hover:border-[#284670] hover:text-[#284670]'
    }`

  const classificacaoCfg = resultado?.avaliacaoPrecoDesejado
    ? CLASSIFICACAO_CONFIG[resultado.avaliacaoPrecoDesejado.classificacao]
    : null

  const temResultadoValido = resultado?.status !== 'erro' && resultado?.resultado.valorAdotado !== null

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col">
      {/* Topbar — logo trocada aqui como preview de uma feature futura (integração com o Jetimob CRM) */}
      <header className="bg-[#284670] h-[55px] flex items-center px-6 shrink-0 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element -- svg estático simples, sem otimização necessária */}
        <img src="/imagens/logo_jetimob_crm_dark.svg" alt="Jetimob CRM" className="h-6 w-auto" />
      </header>

      {/* Main content */}
      <main className="flex-1 w-full px-6 py-6 pb-24">
        <h1 className="text-xl font-bold text-[#111827] mb-1">Precificar Imóvel</h1>

        {/* ── STEP 0 — Dados Básicos ── */}
        <div
          id="step-0"
          className={`bg-white rounded-md border border-[#e5e7eb] shadow-sm mb-4 overflow-hidden transition-all ${
            step > 0 ? 'opacity-55' : ''
          }`}
        >
          <div className="px-6 py-3.5 border-b border-[#e5e7eb] flex items-center gap-3">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                step > 0 ? 'bg-green-500 text-white' : 'bg-[#284670] text-white'
              }`}
            >
              {step > 0 ? '✓' : '1'}
            </span>
            <h2 className="text-sm font-semibold text-[#111827]">Dados Básicos</h2>
          </div>

          <div className={`px-6 py-5 ${step > 0 ? 'pointer-events-none select-none' : ''}`}>
            {/* Tipo */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#111827] mb-2">
                Tipo do imóvel <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TIPOS.map((t) => (
                  <button key={t} type="button" onClick={() => set('tipo', t)} className={pillBtn(form.tipo === t)}>
                    {TIPO_LABEL[t]}
                  </button>
                ))}
              </div>
              {fieldErrors.tipo && <p className="text-red-500 text-xs mt-1">{fieldErrors.tipo}</p>}
            </div>

            {/* CEP + Área privativa */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">
                  CEP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="00000-000"
                  value={form.cep}
                  onChange={(e) => set('cep', maskCep(e.target.value))}
                  className={inputClass(!!fieldErrors.cep)}
                />
                {fieldErrors.cep && <p className="text-red-500 text-xs mt-1">{fieldErrors.cep}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">
                  Área privativa (m²) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Ex: 85"
                  min="1"
                  step="0.01"
                  value={form.area_m2}
                  onChange={(e) => set('area_m2', e.target.value)}
                  className={inputClass(!!fieldErrors.area_m2)}
                />
                {fieldErrors.area_m2 && <p className="text-red-500 text-xs mt-1">{fieldErrors.area_m2}</p>}
              </div>
            </div>

            {/* Preço desejado */}
            <div className="max-w-[240px] mt-4">
              <label className="block text-xs font-medium text-[#111827] mb-1.5">
                Preço que você quer pedir (R$) <span className="text-[11px] text-[#6b7280]">opcional</span>
              </label>
              <input
                type="number"
                placeholder="Ex: 350000"
                min="1"
                step="0.01"
                value={form.preco_desejado}
                onChange={(e) => set('preco_desejado', e.target.value)}
                className={inputClass()}
              />
              <p className="text-[11px] text-[#6b7280] mt-1">
                Informe pra ver se o valor que você quer pedir está abaixo, dentro ou acima do valor adotado.
              </p>
            </div>

            {step === 0 && (
              <div className="flex justify-end mt-5 pt-4 border-t border-[#e5e7eb]">
                <button
                  id="step-0-next-button"
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2 text-sm font-medium rounded bg-[#284670] text-white hover:bg-[#1e3555] transition-colors"
                >
                  Próximo →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── STEP 1 — Características ── */}
        <div
          id="step-1"
          className={`bg-white rounded-md border border-[#e5e7eb] shadow-sm mb-4 overflow-hidden transition-all ${
            step < 1 ? 'opacity-45 bg-[#f9fafb]' : ''
          }`}
        >
          <div className="px-6 py-3.5 border-b border-[#e5e7eb] flex items-center gap-3">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                resultado ? 'bg-green-500 text-white' : step >= 1 ? 'bg-[#284670] text-white' : 'bg-[#d1d5db] text-[#6b7280]'
              }`}
            >
              {resultado ? '✓' : '2'}
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-[#111827]">Características</h2>
              <span className="text-[11px] text-[#6b7280]">
                quartos/banheiros/suítes são só cadastro — a metodologia (NBR 14.653-2) homogeneiza por área e vaga
              </span>
            </div>
          </div>

          <div className={`px-6 py-5 ${step < 1 ? 'pointer-events-none select-none' : ''}`}>
            {/* Quartos, vagas, banheiros e suítes */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">
                  Quartos <span className="text-[11px] text-[#6b7280]">opcional</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.quartos}
                  onChange={(e) => set('quartos', e.target.value)}
                  disabled={step < 1}
                  className={inputClass()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">
                  Vagas <span className="text-[11px] text-[#6b7280]">opcional</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.vaga_garagem}
                  onChange={(e) => set('vaga_garagem', e.target.value)}
                  disabled={step < 1}
                  className={inputClass()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">
                  Banheiros <span className="text-[11px] text-[#6b7280]">opcional</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.banheiros}
                  onChange={(e) => set('banheiros', e.target.value)}
                  disabled={step < 1}
                  className={inputClass()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">
                  Suítes <span className="text-[11px] text-[#6b7280]">opcional</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.suites}
                  onChange={(e) => set('suites', e.target.value)}
                  disabled={step < 1}
                  className={inputClass()}
                />
              </div>
            </div>

            {/* Estado de conservação */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#111827] mb-2">
                Estado de conservação <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {ESTADO_CONSERVACAO_OPCOES.map((o) => (
                  <button
                    key={o.valor}
                    type="button"
                    disabled={step < 1}
                    onClick={() => set('estado_conservacao', o.valor)}
                    className={pillBtn(form.estado_conservacao === o.valor)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#6b7280] mt-1.5">
                Escala Heidecke simplificada — fator aplicado sobre o valor de venda: Novo 1,00 · Bom 0,97 · Regular
                0,92 · Reparos simples 0,82.
              </p>
              {fieldErrors.estado_conservacao && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.estado_conservacao}</p>
              )}
            </div>

            {/* Padrão construtivo */}
            <div>
              <label className="block text-xs font-medium text-[#111827] mb-2">
                Padrão construtivo <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2 max-w-[360px]">
                {PADRAO_CONSTRUTIVO_OPCOES.map((o) => (
                  <button
                    key={o.valor}
                    type="button"
                    disabled={step < 1}
                    onClick={() => set('padrao_construtivo', o.valor)}
                    className={pillBtn(form.padrao_construtivo === o.valor)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#6b7280] mt-1.5">
                Fator aplicado sobre o valor de venda: Baixo 0,90 · Normal 1,00 · Alto 1,10.
              </p>
              {fieldErrors.padrao_construtivo && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.padrao_construtivo}</p>
              )}
            </div>

            {/* Encargos financeiros */}
            <div className="mt-6 pt-5 border-t border-[#e5e7eb]">
              <p className="text-xs font-semibold text-[#111827] mb-3">Encargos financeiros</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#111827] mb-1.5">
                    Condomínio mensal (R$) <span className="text-[11px] text-[#6b7280]">opcional</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 800"
                    value={form.condominio_mensal}
                    onChange={(e) => set('condominio_mensal', e.target.value)}
                    disabled={step < 1}
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#111827] mb-1.5">
                    IPTU anual (R$) <span className="text-[11px] text-[#6b7280]">opcional</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 2400"
                    value={form.iptu_anual}
                    onChange={(e) => set('iptu_anual', e.target.value)}
                    disabled={step < 1}
                    className={inputClass()}
                  />
                </div>
              </div>
            </div>

            {step >= 1 && (
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-medium rounded border border-[#e5e7eb] text-[#374151] bg-white hover:bg-[#f3f4f6] transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  id="step-1-next-button"
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-5 py-2 text-sm font-medium rounded bg-[#284670] text-white hover:bg-[#1e3555] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Calculando...
                    </span>
                  ) : (
                    'Calcular Precificação'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Erro de API ── */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-4 flex items-start gap-2">
            <span className="text-red-500 shrink-0 mt-0.5">⚠</span>
            <p className="text-red-700 text-sm">{apiError}</p>
          </div>
        )}

        {/* ── Resultado ── */}
        {resultado && (
          <>
          <div className="bg-white rounded-md border border-[#e5e7eb] shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 border-b border-[#e5e7eb] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#111827]">Resultado da Precificação</h2>
              {classificacaoCfg && (
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${classificacaoCfg.badge}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${classificacaoCfg.dot}`} />
                  {classificacaoCfg.label}
                </span>
              )}
            </div>

            <div className="px-6 py-5">
              {!temResultadoValido ? (
                <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm text-amber-800">
                  ⚠ {resultado.motivoErro ? MOTIVO_ERRO_LABEL[resultado.motivoErro] ?? resultado.motivoErro : 'Não foi possível calcular o valor para esse imóvel.'}
                </div>
              ) : (
                <>
                  {/* Valor principal */}
                  <div className="text-center py-5">
                    <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-widest mb-2">
                      Valor de venda adotado
                      <span className="group relative inline-flex normal-case tracking-normal">
                        <span
                          tabIndex={0}
                          className="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-[#e5e7eb] text-[10px] font-bold text-[#6b7280] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#284670]"
                        >
                          ?
                        </span>
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-60 -translate-x-1/2 rounded-md bg-[#111827] px-3 py-2 text-[11px] font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                        >
                          Estimado pelo Método Comparativo Direto de Dados de Mercado (NBR 14.653-2), com base em
                          vendas reais e ofertas da região — não é um preço exato, e sim uma referência para apoiar
                          a decisão do corretor.
                        </span>
                      </span>
                    </p>
                    <p className="text-4xl font-bold text-[#284670] leading-none">
                      {formatBRL(resultado.resultado.valorAdotado as number)}
                    </p>
                    {resultado.resultado.intervaloMin !== null && resultado.resultado.intervaloMax !== null && (
                      <p className="text-sm text-[#6b7280] mt-2">
                        Intervalo de confiança:&nbsp;
                        <span className="font-medium text-[#374151]">
                          {formatBRL(resultado.resultado.intervaloMin)} – {formatBRL(resultado.resultado.intervaloMax)}
                        </span>
                      </p>
                    )}
                    {resultado.resultado.campoArbitrioMin !== null && resultado.resultado.campoArbitrioMax !== null && (
                      <p className="text-xs text-[#6b7280] mt-1">
                        Campo de arbítrio: {formatBRL(resultado.resultado.campoArbitrioMin)} –{' '}
                        {formatBRL(resultado.resultado.campoArbitrioMax)}
                      </p>
                    )}
                  </div>

                  {/* Avaliação do preço desejado pelo usuário */}
                  {resultado.avaliacaoPrecoDesejado && (
                    <div className="mb-4 rounded-md border border-[#e5e7eb] px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-[#6b7280]">O preço que você quer pedir</p>
                        <p className="text-lg font-semibold text-[#111827]">
                          {formatBRL(resultado.avaliacaoPrecoDesejado.precoDesejado)}
                        </p>
                        <p className="text-xs text-[#6b7280]">
                          {resultado.avaliacaoPrecoDesejado.indiceDesvio > 0 ? '+' : ''}
                          {(resultado.avaliacaoPrecoDesejado.indiceDesvio * 100).toFixed(1)}% em relação ao valor
                          adotado
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${CLASSIFICACAO_CONFIG[resultado.avaliacaoPrecoDesejado.classificacao].badge}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${CLASSIFICACAO_CONFIG[resultado.avaliacaoPrecoDesejado.classificacao].dot}`}
                        />
                        {CLASSIFICACAO_CONFIG[resultado.avaliacaoPrecoDesejado.classificacao].label}
                      </span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-px bg-[#e5e7eb] rounded-md overflow-hidden">
                    <div className="bg-[#f9fafb] px-4 py-3 text-center">
                      <p className="text-[11px] text-[#6b7280] mb-1">Comparáveis usados</p>
                      <p className="text-sm font-semibold text-[#111827] leading-tight">
                        {resultado.nComparaveisUtilizados}
                      </p>
                    </div>
                    <div className="bg-[#f9fafb] px-4 py-3 text-center">
                      <p className="text-[11px] text-[#6b7280] mb-1">R$/m² médio</p>
                      <p className="text-sm font-semibold text-[#111827] leading-tight">
                        {resultado.estatisticas.vuMedio !== null ? formatBRL(resultado.estatisticas.vuMedio) : '—'}
                      </p>
                    </div>
                    <div className="bg-[#f9fafb] px-4 py-3 text-center">
                      <p className="text-[11px] text-[#6b7280] mb-1">Coeficiente de variação</p>
                      <p className="text-sm font-semibold text-[#111827] leading-tight">
                        {resultado.estatisticas.cvPercentual !== null
                          ? `${resultado.estatisticas.cvPercentual.toFixed(1)}%`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {(resultado.alertas.length > 0 || resultado.avisos.length > 0) && (
                    <div className="mt-4 rounded-md bg-[#f9fafb] border border-[#e5e7eb] px-4 py-3 text-xs text-[#6b7280]">
                      <ul className="list-disc list-inside space-y-0.5">
                        {resultado.alertas.map((alerta) => (
                          <li key={alerta}>{alerta}</li>
                        ))}
                        {resultado.avisos.map((aviso) => (
                          <li key={aviso}>{aviso}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {resultado.memoriaCalculo.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-widest mb-2">
                        Memória de cálculo (comparáveis usados)
                      </p>
                      <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                        {resultado.memoriaCalculo.map((c) => (
                          <li key={c.id} className="rounded border border-[#e5e7eb] px-3 py-2 text-sm">
                            {c.url ? (
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#284670] hover:underline"
                              >
                                {c.titulo ?? c.id}
                              </a>
                            ) : (
                              <span className="text-[#111827] font-medium">{c.titulo ?? `Transação ITBI (${c.id})`}</span>
                            )}
                            <p className="text-xs text-[#6b7280] mt-0.5">
                              VU: {formatBRL(c.vu)}/m² · Fa {c.fa.toFixed(4)} · VUh: {formatBRL(c.vuh)}/m²
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(resultado.rejeitados.length > 0 || resultado.descartadosOutlier.length > 0) && (
                    <p className="text-[11px] text-[#6b7280] mt-3">
                      {resultado.rejeitados.length} comparáveis rejeitados (área/ajuste fora da faixa) ·{' '}
                      {resultado.descartadosOutlier.length} descartados como outlier de preço.
                    </p>
                  )}
                </>
              )}
            </div>

            {!resultado.cte && (
              <div className="px-6 pb-5 flex justify-end">
                <button
                  type="button"
                  onClick={handleNovaPrecificacao}
                  className="px-4 py-2 text-sm font-medium rounded border border-[#284670] text-[#284670] bg-white hover:bg-[#f0f4f9] transition-colors"
                >
                  + Nova precificação
                </button>
              </div>
            )}
          </div>

          {/* ── Custo da Espera (CTE) ── */}
          {resultado.cte && (
            <div className="mt-4 bg-white rounded-md border border-[#e5e7eb] shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 py-3.5 border-b border-[#e5e7eb] flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#111827]">Custo da Espera</h2>
                  <p className="text-[11px] text-[#6b7280] mt-0.5">
                    Quanto custa ao proprietário manter o imóvel parado esperando pelo preço desejado
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-[#6b7280] bg-[#f3f4f6] border border-[#e5e7eb] px-2.5 py-1 rounded-full whitespace-nowrap">
                  CDI {resultado.cte.taxa.cdiAa.toFixed(2)}% a.a. · {resultado.cte.taxa.dataReferencia}
                </span>
              </div>

              <div className="px-6 py-5">
                {/* Três cenários */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {resultado.cte.cenarios.map((c, i) => {
                    const isRed = c.veredicto === 'NAO_COMPENSA'
                    const isGreen = c.veredicto === 'COMPENSA_ESPERAR'
                    return (
                      <div
                        key={c.tMeses}
                        className={`rounded-lg border-2 p-4 flex flex-col transition-colors ${
                          isRed
                            ? 'border-red-200 bg-red-50'
                            : isGreen
                              ? 'border-green-200 bg-green-50'
                              : i === 1
                                ? 'border-[#284670]/20 bg-[#f0f4f9]'
                                : 'border-[#e5e7eb] bg-[#f9fafb]'
                        }`}
                      >
                        <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest mb-2">
                          {c.tMeses} meses
                        </p>

                        <p
                          className={`text-2xl font-bold leading-none mb-0.5 ${
                            isRed ? 'text-red-700' : isGreen ? 'text-green-700' : 'text-[#111827]'
                          }`}
                        >
                          {formatBRL(c.cte)}
                        </p>
                        <p className="text-[11px] text-[#6b7280] mb-3">custo total</p>

                        <div className="space-y-1.5 text-[11px] flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#6b7280]">Cond. + IPTU</span>
                            <span className="font-medium text-[#374151] tabular-nums">{formatBRL(c.cft)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#6b7280]">Oportunidade (CDI)</span>
                            <span className="font-medium text-[#374151] tabular-nums">{formatBRL(c.co)}</span>
                          </div>
                        </div>

                        {c.veredicto && (
                          <div className="mt-3 pt-3 border-t border-current/10">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isGreen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${isGreen ? 'bg-green-500' : 'bg-red-500'}`}
                              />
                              {isGreen ? 'Vale esperar' : 'Não compensa'}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Breakeven / Comparativo */}
                {resultado.cte.comparativo &&
                  resultado.cte.comparativo.veredictoGeral !== 'SEM_GANHO_A_PERSEGUIR' && (
                    <div
                      className={`rounded-md px-4 py-3 flex items-start gap-3 mb-4 ${
                        resultado.cte.comparativo.veredictoGeral === 'GANHO_SUPERA_HORIZONTE'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-amber-50 border border-amber-200'
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          resultado.cte.comparativo.veredictoGeral === 'GANHO_SUPERA_HORIZONTE'
                            ? 'text-blue-500'
                            : 'text-amber-500'
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-[#111827] mb-0.5">
                          {resultado.cte.comparativo.breakevenMeses !== null
                            ? `Ponto de virada: ~${resultado.cte.comparativo.breakevenMeses} meses`
                            : 'O ganho supera o custo em qualquer horizonte'}
                        </p>
                        <p className="text-xs text-[#374151] leading-relaxed">
                          {resultado.cte.comparativo.frase}
                        </p>
                        {resultado.cte.comparativo.ganhoPretendido > 0 && (
                          <p className="text-[11px] text-[#6b7280] mt-1">
                            Ganho pretendido:{' '}
                            <span className="font-medium text-[#374151]">
                              {formatBRL(resultado.cte.comparativo.ganhoPretendido)}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                {/* Disclaimers */}
                <p className="text-[10px] text-[#9ca3af] leading-relaxed">
                  {resultado.cte.disclaimers.join(' ')}
                  {resultado.cte.taxa.fonte !== 'sgs' && (
                    <span className="ml-1">
                      (Taxa via {resultado.cte.taxa.fonte === 'cache' ? 'cache local' : 'valor fixo de referência'} —
                      API do Banco Central indisponível no momento.)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {resultado.cte && (
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={handleNovaPrecificacao}
                className="px-4 py-2 text-sm font-medium rounded border border-[#284670] text-[#284670] bg-white hover:bg-[#f0f4f9] transition-colors"
              >
                + Nova precificação
              </button>
            </div>
          )}
          </>
        )}
      </main>
    </div>
  )
}
