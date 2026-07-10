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
  estado_conservacao: EstadoConservacao | ''
  padrao_construtivo: PadraoConstrutivo | ''
}

interface AnaliseVendas {
  amostra: number
  precoM2Mediana: number
  nivelFiltro: string
  precoJustoEstimado: number
  fatorEstadoConservacao: number
  fatorPadraoConstrutivo: number
}

interface Comparavel {
  id: string
  titulo: string
  quartos: number | null
  vagas: number | null
  mobiliado: boolean | null
  areaM2: number
  preco: number
  url: string
}

interface AnaliseOfertas {
  amostra: number
  precoM2Mediana: number
  nivelFiltro: string
  precoOfertadoEstimado: number
  comparaveis: Comparavel[]
}

interface AvaliacaoPrecoDesejado {
  precoDesejado: number
  indiceDesvio: number
  classificacao: Classificacao
}

interface ResultadoPrecificacao {
  vendas: AnaliseVendas | null
  ofertas: AnaliseOfertas | null
  indiceDesvio: number | null
  classificacao: Classificacao | null
  avaliacaoPrecoDesejado: AvaliacaoPrecoDesejado | null
  avisos: string[]
}

const TIPOS: Tipo[] = ['APARTAMENTO', 'CASA', 'CHACARA', 'COBERTURA', 'SALA_COMERCIAL', 'LOJA', 'TERRENO']

// Também é o texto enviado ao serviço (vocabulário do Jetlar/ITBI, normalizado internamente).
const TIPO_LABEL: Record<Tipo, string> = {
  APARTAMENTO: 'Apartamento',
  CASA: 'Casa',
  CHACARA: 'Chácara',
  COBERTURA: 'Cobertura',
  SALA_COMERCIAL: 'Sala Comercial',
  LOJA: 'Loja',
  TERRENO: 'Terreno',
}

// Escala Heidecke simplificada — deprecia o preço justo conforme o estado de
// conservação real do imóvel (a base do ITBI reflete o padrão médio da
// região, não o imóvel específico).
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
  estado_conservacao: '',
  padrao_construtivo: '',
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
    if (form.quartos === '' || parseInt(form.quartos, 10) < 0) errs.quartos = 'Informe o número de quartos'
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
        quartos: parseInt(form.quartos, 10),
        estadoConservacao: estadoConservacao?.servico,
        padraoConstrutivo: padraoConstrutivo?.servico,
        ...(form.vaga_garagem ? { vagas: parseInt(form.vaga_garagem, 10) } : {}),
        ...(form.preco_desejado ? { precoDesejado: parseFloat(form.preco_desejado) } : {}),
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

  const classificacaoCfg = resultado?.classificacao ? CLASSIFICACAO_CONFIG[resultado.classificacao] : null

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col">
      {/* Topbar */}
      <header className="bg-[#284670] h-[55px] flex items-center px-6 shrink-0 shadow-sm">
        <span className="text-white font-bold text-base tracking-tight select-none">PrecificaJusta</span>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full px-6 py-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-[#111827] mb-1">Precificar Imóvel</h1>
        <p className="text-xs text-[#6b7280] mb-5">
          Comparamos vendas reais (ITBI) com ofertas ativas (Jetlar) para Porto Alegre. O bairro é resolvido
          automaticamente a partir do CEP.
        </p>

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
                Informe pra ver se o valor que você quer pedir está abaixo, dentro ou acima do preço de venda
                estimado.
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
            <h2 className="text-sm font-semibold text-[#111827]">Características</h2>
          </div>

          <div className={`px-6 py-5 ${step < 1 ? 'pointer-events-none select-none' : ''}`}>
            {/* Quartos + Vaga de garagem */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">
                  Número de quartos <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.quartos}
                  onChange={(e) => set('quartos', e.target.value)}
                  disabled={step < 1}
                  className={inputClass(!!fieldErrors.quartos)}
                />
                {fieldErrors.quartos && <p className="text-red-500 text-xs mt-1">{fieldErrors.quartos}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">
                  Vaga de garagem <span className="text-[11px] text-[#6b7280]">opcional</span>
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
                Escala Heidecke simplificada — fator aplicado sobre o preço justo: Novo 1,00 · Bom 0,97 · Regular
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
                Fator aplicado sobre o preço justo: Baixo 0,90 · Normal 1,00 · Alto 1,10.
              </p>
              {fieldErrors.padrao_construtivo && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.padrao_construtivo}</p>
              )}
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
              {!resultado.vendas && !resultado.ofertas ? (
                <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm text-amber-800">
                  ⚠ Dados insuficientes para precificar essa combinação de bairro/tipo. Tente um CEP próximo ou
                  confira o tipo selecionado.
                </div>
              ) : (
                <>
                  {/* Preço principal */}
                  <div className="text-center py-5">
                    <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-widest mb-2">
                      Preço de venda estimado
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
                          Valor estimado com base em transações e ofertas da região — não é um preço exato, e sim
                          uma referência para apoiar a decisão do corretor.
                        </span>
                      </span>
                    </p>
                    <p className="text-4xl font-bold text-[#284670] leading-none">
                      {resultado.vendas ? formatBRL(resultado.vendas.precoJustoEstimado) : '—'}
                    </p>
                    {resultado.vendas && (
                      <p className="text-xs text-[#6b7280] mt-2">
                        Ajustado por conservação ({resultado.vendas.fatorEstadoConservacao.toFixed(2)}) e padrão
                        construtivo ({resultado.vendas.fatorPadraoConstrutivo.toFixed(2)})
                      </p>
                    )}
                    {resultado.ofertas && (
                      <p className="text-sm text-[#6b7280] mt-2">
                        Ofertado no mercado (Jetlar):&nbsp;
                        <span className="font-medium text-[#374151]">
                          {formatBRL(resultado.ofertas.precoOfertadoEstimado)}
                        </span>
                      </p>
                    )}
                    {resultado.indiceDesvio !== null && (
                      <p className="text-xs text-[#6b7280] mt-1">
                        Índice de desvio: {(resultado.indiceDesvio * 100).toFixed(1)}%
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
                          {(resultado.avaliacaoPrecoDesejado.indiceDesvio * 100).toFixed(1)}% em relação ao preço
                          de venda estimado
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
                  <div className="grid grid-cols-2 gap-px bg-[#e5e7eb] rounded-md overflow-hidden">
                    <div className="bg-[#f9fafb] px-4 py-3 text-center">
                      <p className="text-[11px] text-[#6b7280] mb-1">Vendas reais usadas (ITBI)</p>
                      <p className="text-sm font-semibold text-[#111827] leading-tight">
                        {resultado.vendas ? `${resultado.vendas.amostra} · ${resultado.vendas.nivelFiltro}` : '—'}
                      </p>
                    </div>
                    <div className="bg-[#f9fafb] px-4 py-3 text-center">
                      <p className="text-[11px] text-[#6b7280] mb-1">Ofertas usadas (Jetlar)</p>
                      <p className="text-sm font-semibold text-[#111827] leading-tight">
                        {resultado.ofertas ? `${resultado.ofertas.amostra} · ${resultado.ofertas.nivelFiltro}` : '—'}
                      </p>
                    </div>
                  </div>

                  {resultado.avisos.length > 0 && (
                    <div className="mt-4 rounded-md bg-[#f9fafb] border border-[#e5e7eb] px-4 py-3 text-xs text-[#6b7280]">
                      <ul className="list-disc list-inside space-y-0.5">
                        {resultado.avisos.map((aviso) => (
                          <li key={aviso}>{aviso}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {resultado.ofertas && resultado.ofertas.comparaveis.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-widest mb-2">
                        Comparáveis usados
                      </p>
                      <ul className="flex flex-col gap-2">
                        {resultado.ofertas.comparaveis.map((c) => (
                          <li key={c.id} className="rounded border border-[#e5e7eb] px-3 py-2 text-sm">
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#284670] hover:underline"
                            >
                              {c.titulo}
                            </a>
                            <p className="text-xs text-[#6b7280] mt-0.5">
                              {c.areaM2}m² · {formatBRL(c.preco)}
                              {c.mobiliado ? ' · mobiliado' : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-6 pb-5 flex justify-end">
              <button
                type="button"
                onClick={handleNovaPrecificacao}
                className="px-4 py-2 text-sm font-medium rounded border border-[#284670] text-[#284670] bg-white hover:bg-[#f0f4f9] transition-colors"
              >
                + Nova precificação
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
