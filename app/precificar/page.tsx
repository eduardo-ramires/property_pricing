'use client'

import { useState } from 'react'

type Tipo = 'APARTAMENTO' | 'CASA' | 'TERRENO' | 'COMERCIAL'
type Finalidade = 'VENDA' | 'LOCACAO'
type Condicao = 'NOVO' | 'BOM' | 'REGULAR' | 'RUIM'
type Mobilia = 'MOBILIADO' | 'SEMI_MOBILIADO' | 'SEM_MOBILIA'
type OrientacaoSolar = 'NORTE' | 'SUL' | 'LESTE' | 'OESTE' | 'NORDESTE' | 'NOROESTE' | 'SUDESTE' | 'SUDOESTE'
type Posicao = 'FRENTE' | 'FUNDOS' | 'LATERAL' | 'MEIO'
type TipoPiso = 'PORCELANATO' | 'CERAMICA' | 'MADEIRA' | 'VINILICO' | 'MARMORE' | 'GRANITO' | 'OUTRO'
type Confianca = 'ALTA' | 'MEDIA' | 'BAIXA' | 'INSUFICIENTE'

interface FormState {
  tipo: Tipo | ''
  finalidade: Finalidade | ''
  cep: string
  area_m2: string
  dormitorios: string
  suites: string
  banheiros: string
  vagas_garagem: string
  condicao: Condicao | ''
  mobilia: Mobilia | ''
  orientacao_solar: OrientacaoSolar | ''
  posicao: Posicao | ''
  tipo_piso: TipoPiso | ''
}

interface ResultadoPrecificacao {
  preco_estimado: number
  faixa_minima: number
  faixa_maxima: number
  preco_medio_m2: number
  comparaveis_utilizados: number
  bairro_referencia: string
  confianca: Confianca
}

const CONFIANCA_CONFIG: Record<Confianca, { label: string; badge: string; dot: string }> = {
  ALTA:         { label: 'Alta',        badge: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  MEDIA:        { label: 'Média',       badge: 'bg-blue-100 text-blue-800',   dot: 'bg-blue-500' },
  BAIXA:        { label: 'Baixa',       badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  INSUFICIENTE: { label: 'Insuficiente', badge: 'bg-red-100 text-red-800',   dot: 'bg-red-500' },
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

const EMPTY_FORM: FormState = {
  tipo: '', finalidade: '', cep: '', area_m2: '',
  dormitorios: '', suites: '', banheiros: '', vagas_garagem: '',
  condicao: '', mobilia: '', orientacao_solar: '', posicao: '', tipo_piso: '',
}

export default function PrecificarPage() {
  const [step, setStep]           = useState(0)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading]     = useState(false)
  const [resultado, setResultado] = useState<ResultadoPrecificacao | null>(null)
  const [apiError, setApiError]   = useState<string | null>(null)

  function set(key: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  function validateStep0() {
    const errs: Record<string, string> = {}
    if (!form.tipo) errs.tipo = 'Tipo do imóvel é obrigatório'
    if (!form.finalidade) errs.finalidade = 'Finalidade é obrigatória'
    if (form.cep.replace(/\D/g, '').length !== 8) errs.cep = 'CEP deve conter exatamente 8 dígitos'
    if (!form.area_m2 || parseFloat(form.area_m2) <= 0) errs.area_m2 = 'Área deve ser maior que zero'
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
    setLoading(true)
    setApiError(null)
    setResultado(null)

    const payload: Record<string, unknown> = {
      tipo: form.tipo,
      finalidade: form.finalidade,
      cep: form.cep.replace(/\D/g, ''),
      area_m2: parseFloat(form.area_m2),
    }
    if (form.dormitorios)     payload.dormitorios    = parseInt(form.dormitorios)
    if (form.suites)          payload.suites         = parseInt(form.suites)
    if (form.banheiros)       payload.banheiros      = parseInt(form.banheiros)
    if (form.vagas_garagem)   payload.vagas_garagem  = parseInt(form.vagas_garagem)
    if (form.condicao)        payload.condicao       = form.condicao
    if (form.mobilia)         payload.mobilia        = form.mobilia
    if (form.orientacao_solar) payload.orientacao_solar = form.orientacao_solar
    if (form.posicao)         payload.posicao        = form.posicao
    if (form.tipo_piso)       payload.tipo_piso      = form.tipo_piso

    try {
      const res  = await fetch('/api/precificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.detalhes) {
          const mapped: Record<string, string> = {}
          for (const [k, v] of Object.entries(data.detalhes as Record<string, string[]>)) {
            mapped[k] = v[0]
          }
          setFieldErrors(mapped)
          if (Object.keys(mapped).some(k => ['tipo','finalidade','cep','area_m2'].includes(k))) setStep(0)
        }
        setApiError(data.erro ?? 'Erro ao calcular precificação')
      } else {
        const p = data.precificacao as ResultadoPrecificacao
        alert(`Valor sugerido: ${formatBRL(p.preco_estimado)}\nFaixa: ${formatBRL(p.faixa_minima)} – ${formatBRL(p.faixa_maxima)}`)
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

  const selectClass = (hasError?: boolean) =>
    `w-full h-9 px-2 text-sm rounded border bg-white text-[#111827]
    focus:outline-none focus:ring-1 focus:ring-[#284670] focus:border-[#284670] transition-colors
    disabled:bg-[#f3f4f6] disabled:text-[#9ca3af] disabled:cursor-not-allowed
    ${hasError ? 'border-red-400' : 'border-[#e5e7eb]'}`

  const pillBtn = (active: boolean) =>
    `px-3 py-2 text-xs font-medium rounded border transition-colors ${
      active
        ? 'bg-[#284670] text-white border-[#284670]'
        : 'bg-white text-[#374151] border-[#e5e7eb] hover:border-[#284670] hover:text-[#284670]'
    }`

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col">
      {/* Topbar */}
      <header className="bg-[#284670] h-[55px] flex items-center px-6 shrink-0 shadow-sm">
        <span className="text-white font-bold text-base tracking-tight select-none">
          MetroCerto
        </span>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full px-6 py-6">

        <h1 className="text-xl font-bold text-[#111827] mb-5">Precificar Imóvel</h1>

        {/* ── STEP 0 — Dados Básicos ── */}
        <div
          id="step-0"
          className={`bg-white rounded-md border border-[#e5e7eb] shadow-sm mb-4 overflow-hidden transition-all ${
            step > 0 ? 'opacity-55' : ''
          }`}
        >
          {/* Step header */}
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

            {/* Finalidade */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#111827] mb-2">
                Finalidade <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 max-w-[240px]">
                {(['VENDA', 'LOCACAO'] as Finalidade[]).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => set('finalidade', f)}
                    className={pillBtn(form.finalidade === f)}
                  >
                    {f === 'VENDA' ? 'Venda' : 'Locação'}
                  </button>
                ))}
              </div>
              {fieldErrors.finalidade && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.finalidade}</p>
              )}
            </div>

            {/* CEP + Área */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">
                  CEP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="00000-000"
                  value={form.cep}
                  onChange={e => set('cep', maskCep(e.target.value))}
                  className={inputClass(!!fieldErrors.cep)}
                />
                {fieldErrors.cep && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.cep}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">
                  Área total (m²) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Ex: 85"
                  min="1"
                  step="0.01"
                  value={form.area_m2}
                  onChange={e => set('area_m2', e.target.value)}
                  className={inputClass(!!fieldErrors.area_m2)}
                />
                {fieldErrors.area_m2 && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.area_m2}</p>
                )}
              </div>
            </div>

            {/* Actions */}
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
              <span className="text-[11px] text-[#6b7280]">opcionais</span>
            </div>
          </div>

          <div className={`px-6 py-5 ${step < 1 ? 'pointer-events-none select-none' : ''}`}>
            {/* Contadores */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {([
                { key: 'dormitorios',  label: 'Dormitórios' },
                { key: 'suites',       label: 'Suítes' },
                { key: 'banheiros',    label: 'Banheiros' },
                { key: 'vagas_garagem', label: 'Vagas' },
              ] as { key: keyof FormState; label: string }[]).map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-[#111827] mb-1.5">{label}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    disabled={step < 1}
                    className={inputClass()}
                  />
                </div>
              ))}
            </div>

            {/* Selects */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">Condição</label>
                <select
                  value={form.condicao}
                  onChange={e => set('condicao', e.target.value)}
                  disabled={step < 1}
                  className={selectClass()}
                >
                  <option value="">Selecione</option>
                  <option value="NOVO">Novo</option>
                  <option value="BOM">Bom</option>
                  <option value="REGULAR">Regular</option>
                  <option value="RUIM">Ruim</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">Mobília</label>
                <select
                  value={form.mobilia}
                  onChange={e => set('mobilia', e.target.value)}
                  disabled={step < 1}
                  className={selectClass()}
                >
                  <option value="">Selecione</option>
                  <option value="MOBILIADO">Mobiliado</option>
                  <option value="SEMI_MOBILIADO">Semi-mobiliado</option>
                  <option value="SEM_MOBILIA">Sem mobília</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">Orientação solar</label>
                <select
                  value={form.orientacao_solar}
                  onChange={e => set('orientacao_solar', e.target.value)}
                  disabled={step < 1}
                  className={selectClass()}
                >
                  <option value="">Selecione</option>
                  {(
                    ['NORTE','SUL','LESTE','OESTE','NORDESTE','NOROESTE','SUDESTE','SUDOESTE'] as OrientacaoSolar[]
                  ).map(o => (
                    <option key={o} value={o}>
                      {o.charAt(0) + o.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">Posição</label>
                <select
                  value={form.posicao}
                  onChange={e => set('posicao', e.target.value)}
                  disabled={step < 1}
                  className={selectClass()}
                >
                  <option value="">Selecione</option>
                  <option value="FRENTE">Frente</option>
                  <option value="FUNDOS">Fundos</option>
                  <option value="LATERAL">Lateral</option>
                  <option value="MEIO">Meio</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111827] mb-1.5">Tipo de piso</label>
                <select
                  value={form.tipo_piso}
                  onChange={e => set('tipo_piso', e.target.value)}
                  disabled={step < 1}
                  className={selectClass()}
                >
                  <option value="">Selecione</option>
                  <option value="PORCELANATO">Porcelanato</option>
                  <option value="CERAMICA">Cerâmica</option>
                  <option value="MADEIRA">Madeira</option>
                  <option value="VINILICO">Vinílico</option>
                  <option value="MARMORE">Mármore</option>
                  <option value="GRANITO">Granito</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
            </div>

            {/* Actions */}
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
              {(() => {
                const cfg = CONFIANCA_CONFIG[resultado.confianca]
                return (
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    Confiança {cfg.label}
                  </span>
                )
              })()}
            </div>

            <div className="px-6 py-5">
              {resultado.confianca === 'INSUFICIENTE' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm text-amber-800">
                  ⚠ Dados insuficientes para precificar a região informada. Verifique o CEP ou tente uma área próxima.
                </div>
              ) : (
                <>
                  {/* Preço principal */}
                  <div className="text-center py-5">
                    <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-widest mb-2">
                      Preço estimado
                    </p>
                    <p className="text-4xl font-bold text-[#284670] leading-none">
                      {formatBRL(resultado.preco_estimado)}
                    </p>
                    <p className="text-sm text-[#6b7280] mt-2">
                      Faixa:&nbsp;
                      <span className="font-medium text-[#374151]">{formatBRL(resultado.faixa_minima)}</span>
                      &nbsp;–&nbsp;
                      <span className="font-medium text-[#374151]">{formatBRL(resultado.faixa_maxima)}</span>
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-px bg-[#e5e7eb] rounded-md overflow-hidden">
                    {[
                      { label: 'Preço médio/m²',      value: formatBRL(resultado.preco_medio_m2) },
                      { label: 'Comparáveis usados',   value: String(resultado.comparaveis_utilizados) },
                      { label: 'Referência',            value: resultado.bairro_referencia || '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-[#f9fafb] px-4 py-3 text-center">
                        <p className="text-[11px] text-[#6b7280] mb-1">{label}</p>
                        <p className="text-sm font-semibold text-[#111827] leading-tight">{value}</p>
                      </div>
                    ))}
                  </div>
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