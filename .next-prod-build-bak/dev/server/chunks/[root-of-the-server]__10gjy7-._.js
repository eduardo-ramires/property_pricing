module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[project]/lib/pricing.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calcularPrecificacao",
    ()=>calcularPrecificacao
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
const ITBI_TYPE_MAP = {
    APARTAMENTO: [
        'APARTAMENTO',
        'APARTAMENTO DE COBERTURA',
        'APART-HOTEL(FLAT)'
    ],
    CASA: [
        'RESIDENCIA ISOLADA',
        'RESIDENCIA PADRONIZADA EM COND HORIZONTAL FECHADO',
        'RESIDENCIA CONDOM HORIZ ABERTO SEM AREA USO COMUM',
        'RESIDENCIA NAO PADRONIZ EM CONDOM HORIZONTAL FECHADO',
        'RESIDENCIA DE FRENTE COM INTERIORES',
        'RESIDENCIA DE INTERIOR'
    ],
    COMERCIAL: [
        'SALA COMERCIAL',
        'UNIDADE DE COMERCIO E SERVICO ISOLADA',
        'LOJA TERREA EM EDIFICIO',
        'LOJA EM GALERIA',
        'UNIDADE (DE COMÉRCIO OU SERVIÇOS) DE  FRENTE NÃO ISOLADA',
        'LOJA TERREA ISOLADA'
    ],
    TERRENO: [
        'CONSTRUCAO EM AREA PROJETADA DE GLEBA',
        'TERRENO'
    ]
};
// In-process cache — populated once per server lifecycle
let _cache = null;
function carregarDados() {
    if (_cache) return _cache;
    const arquivos = [
        'itbi-2026.csv',
        'itbi-2025.csv',
        'itbi-2024.csv'
    ];
    const registros = [];
    for (const arquivo of arquivos){
        const caminho = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["join"])(process.cwd(), 'dataset', arquivo);
        const linhas = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["readFileSync"])(caminho, 'utf-8').split('\n');
        // header index:
        // 0:data_estimativa 1:data_pagamento 2:base_de_calculo 3:perc_transmitido
        // 4:finalidade_construcao 5:logradouro 6:n_endereco 7:n_unidade
        // 8:complemento_endereco 9:bairro 10:cep 11:area_total_terreno
        // 12:area_constr_total 13:area_constr_privativa 14:ano_construcao ...
        for(let i = 1; i < linhas.length; i++){
            const cols = linhas[i].split(';');
            if (cols.length < 15) continue;
            const preco = parseFloat(cols[2]);
            const area = parseFloat(cols[12]);
            const cep = cols[10]?.trim().replace(/\D/g, '');
            const bairro = cols[9]?.replace(/'/g, '').trim();
            const tipo = cols[4]?.replace(/'/g, '').trim();
            if (!preco || !area || area < 10 || !cep || cep.length < 5) continue;
            const preco_m2 = preco / area;
            if (preco_m2 < 500 || preco_m2 > 80000) continue;
            registros.push({
                cep,
                cep_prefix: cep.slice(0, 5),
                bairro,
                tipo,
                area_m2: area,
                preco,
                preco_m2
            });
        }
    }
    _cache = registros;
    return registros;
}
function mediana(valores) {
    if (!valores.length) return 0;
    const ordenados = [
        ...valores
    ].sort((a, b)=>a - b);
    const meio = Math.floor(ordenados.length / 2);
    return ordenados.length % 2 === 0 ? (ordenados[meio - 1] + ordenados[meio]) / 2 : ordenados[meio];
}
function encontrarBairro(dados, cepPrefix) {
    const registro = dados.find((r)=>r.cep_prefix === cepPrefix);
    return registro?.bairro ?? '';
}
function filtrarComparaveis(dados, tiposITBI, cepPrefix, bairro) {
    // Tier 1: mesmo CEP (5 dígitos) + tipo
    const porCep = dados.filter((r)=>r.cep_prefix === cepPrefix && tiposITBI.includes(r.tipo));
    if (porCep.length >= 10) return {
        registros: porCep,
        escopo: 'cep'
    };
    // Tier 2: mesmo bairro + tipo
    if (bairro) {
        const porBairro = dados.filter((r)=>r.bairro === bairro && tiposITBI.includes(r.tipo));
        if (porBairro.length >= 5) return {
            registros: porBairro,
            escopo: 'bairro'
        };
    }
    // Tier 3: cidade inteira + tipo (baixa confiança)
    const porTipo = dados.filter((r)=>tiposITBI.includes(r.tipo));
    return {
        registros: porTipo,
        escopo: 'cidade'
    };
}
function calcularPrecificacao(dados) {
    const registros = carregarDados();
    const tiposITBI = ITBI_TYPE_MAP[dados.tipo];
    const cepPrefix = dados.cep.slice(0, 5);
    const bairro = encontrarBairro(registros, cepPrefix);
    const { registros: comparaveis, escopo } = filtrarComparaveis(registros, tiposITBI, cepPrefix, bairro);
    const precosMedioM2 = comparaveis.map((r)=>r.preco_m2);
    const precoMedioM2 = mediana(precosMedioM2);
    if (!precoMedioM2 || comparaveis.length === 0) {
        return {
            preco_estimado: 0,
            faixa_minima: 0,
            faixa_maxima: 0,
            preco_medio_m2: 0,
            comparaveis_utilizados: 0,
            bairro_referencia: bairro,
            confianca: 'INSUFICIENTE'
        };
    }
    const precoEstimado = Math.round(precoMedioM2 * dados.area_m2);
    const margem = escopo === 'cep' ? 0.1 : escopo === 'bairro' ? 0.15 : 0.25;
    const confianca = comparaveis.length >= 30 && escopo === 'cep' ? 'ALTA' : comparaveis.length >= 10 && escopo !== 'cidade' ? 'MEDIA' : comparaveis.length >= 5 ? 'BAIXA' : 'INSUFICIENTE';
    return {
        preco_estimado: precoEstimado,
        faixa_minima: Math.round(precoEstimado * (1 - margem)),
        faixa_maxima: Math.round(precoEstimado * (1 + margem)),
        preco_medio_m2: Math.round(precoMedioM2),
        comparaveis_utilizados: comparaveis.length,
        bairro_referencia: bairro || `prefixo CEP ${cepPrefix}`,
        confianca
    };
}
}),
"[project]/app/api/precificar/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pricing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/pricing.ts [app-route] (ecmascript)");
;
;
;
const Schema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    tipo: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'APARTAMENTO',
        'CASA',
        'TERRENO',
        'COMERCIAL'
    ], {
        error: 'Tipo deve ser APARTAMENTO, CASA, TERRENO ou COMERCIAL'
    }),
    finalidade: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'VENDA',
        'LOCACAO'
    ], {
        error: 'Finalidade deve ser VENDA ou LOCACAO'
    }),
    cep: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{8}$/, 'CEP deve conter exatamente 8 dígitos numéricos'),
    area_m2: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number({
        error: 'Área em m² é obrigatória'
    }).positive('Área deve ser maior que zero'),
    dormitorios: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).optional(),
    suites: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).optional(),
    banheiros: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).optional(),
    vagas_garagem: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).optional(),
    condicao: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'NOVO',
        'BOM',
        'REGULAR',
        'RUIM'
    ]).optional(),
    mobilia: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'MOBILIADO',
        'SEMI_MOBILIADO',
        'SEM_MOBILIA'
    ]).optional(),
    orientacao_solar: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'NORTE',
        'SUL',
        'LESTE',
        'OESTE',
        'NORDESTE',
        'NOROESTE',
        'SUDESTE',
        'SUDOESTE'
    ]).optional(),
    posicao: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'FRENTE',
        'FUNDOS',
        'LATERAL',
        'MEIO'
    ]).optional(),
    tipo_piso: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'PORCELANATO',
        'CERAMICA',
        'MADEIRA',
        'VINILICO',
        'MARMORE',
        'GRANITO',
        'OUTRO'
    ]).optional()
});
async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch  {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            erro: 'Corpo da requisição inválido. Envie JSON válido.'
        }, {
            status: 400
        });
    }
    const resultado = Schema.safeParse(body);
    if (!resultado.success) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            erro: 'Dados inválidos',
            detalhes: resultado.error.flatten().fieldErrors
        }, {
            status: 422
        });
    }
    const precificacao = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pricing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["calcularPrecificacao"])(resultado.data);
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        entrada: resultado.data,
        precificacao
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__10gjy7-._.js.map