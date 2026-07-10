'use client'

import { useState } from 'react'

type Tipo = 'Apartamento' | 'Casa' | 'Cobertura' | 'Sala Comercial' | 'Loja' | 'Terreno'
type Classificacao = 'abaixo_do_mercado' | 'dentro_do_mercado' | 'acima_do_mercado'

interface FormState {
  tipo: Tipo | ''
  cidade: string
  bairro: string
  area_m2: string
  quartos: string
  mobiliado: '' | 'sim' | 'nao'
}

interface AnaliseVendas {
  amostra: number
  precoM2Mediana: number
  nivelFiltro: string
  precoJustoEstimado: number
}

interface Comparavel {
  id: string
  titulo: string
  quartos: number | null
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

interface ResultadoPrecificacao {
  vendas: AnaliseVendas | null
  ofertas: AnaliseOfertas | null
  indiceDesvio: number | null
  classificacao: Classificacao | null
  avisos: string[]
}

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

const EMPTY_FORM: FormState = {
  tipo: '', finalidade: 'VENDA', cep: '', area_m2: '',
  dormitorios: '', suites: '', banheiros: '', vagas_garagem: '',
  condicao: '', mobilia: '', orientacao_solar: '', posicao: '', tipo_piso: '',
}

const TIPOS: Tipo[] = ['Apartamento', 'Casa', 'Cobertura', 'Sala Comercial', 'Loja', 'Terreno']

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
    if (!form.cidade.trim()) errs.cidade = 'Cidade é obrigatória'
    if (!form.bairro.trim()) errs.bairro = 'Bairro é obrigatório'
    if (!form.area_m2 || parseFloat(form.area_m2) <= 0) errs.area_m2 = 'Área deve ser maior que zero'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep1() {
    const errs: Record<string, string> = {}
    if (form.quartos === '' || parseInt(form.quartos, 10) < 0) errs.quartos = 'Informe o número de quartos'
    if (!form.mobiliado) errs.mobiliado = 'Informe se o imóvel é mobiliado'
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

    const payload = {
      cidade: form.cidade.trim(),
      bairro: form.bairro.trim(),
      tipo: form.tipo,
      areaM2: parseFloat(form.area_m2),
      quartos: parseInt(form.quartos, 10),
      mobiliado: form.mobiliado === 'sim',
    }

    try {
      const res = await fetch('/api/precificacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.detalhes?.fieldErrors) {
          const mapped: Record<string, string> = {}
          for (const [k, v] of Object.entries(data.detalhes.fieldErrors as Record<string, string[]>)) {
            mapped[k] = v[0]
          }
          setFieldErrors(mapped)
        }
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
          Comparamos vendas reais (ITBI) com ofertas ativas (Jetlar) para Porto Alegre.
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
                {(['APARTAMENTO', 'CASA', 'COMERCIAL', 'TERRENO'] as Tipo[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('tipo', t)}
                    className={pillBtn(form.tipo === t)}
                  >
                    {t === 'APARTAMENTO' ? 'Apartamento'
                      : t === 'CASA' ? 'Casa'
                      : t === 'COMERCIAL' ? 'Comercial'
                      : 'Terreno'}
                  </button>
                ))}
              </div>
              {fieldErrors.tipo && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.tipo}</p>
              )}
            </div>


            {/* Cidade + Bairro */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">
                  Cidade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.cidade}
                  onChange={(e) => set('cidade', e.target.value)}
                  className={inputClass(!!fieldErrors.cidade)}
                />
                {fieldErrors.cidade && <p className="text-red-500 text-xs mt-1">{fieldErrors.cidade}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">
                  Bairro <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Petrópolis"
                  value={form.bairro}
                  onChange={(e) => set('bairro', e.target.value)}
                  className={inputClass(!!fieldErrors.bairro)}
                />
                {fieldErrors.bairro && <p className="text-red-500 text-xs mt-1">{fieldErrors.bairro}</p>}
              </div>
            </div>

            {/* Área */}
            <div className="max-w-[240px]">
              <label className="block text-xs font-medium text-[#111827] mb-1.5">
                Área total (m²) <span className="text-red-500">*</span>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">
                  Quartos <span className="text-red-500">*</span>
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
                <label className="block text-xs font-medium text-[#111827] mb-2">
                  Mobiliado <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={step < 1}
                    onClick={() => set('mobiliado', 'sim')}
                    className={pillBtn(form.mobiliado === 'sim')}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    disabled={step < 1}
                    onClick={() => set('mobiliado', 'nao')}
                    className={pillBtn(form.mobiliado === 'nao')}
                  >
                    Não
                  </button>
                </div>
                {fieldErrors.mobiliado && <p className="text-red-500 text-xs mt-1">{fieldErrors.mobiliado}</p>}
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
                  ⚠ Dados insuficientes para precificar essa combinação de bairro/tipo. Tente um bairro vizinho ou
                  confira a grafia.
                </div>
              ) : (
                <>
                  {/* Preço principal */}
                  <div className="text-center py-5">
                    <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-widest mb-2">
                      Preço justo estimado (ITBI)
                    </p>
                    <p className="text-4xl font-bold text-[#284670] leading-none">
                      {resultado.vendas ? formatBRL(resultado.vendas.precoJustoEstimado) : '—'}
                    </p>
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
