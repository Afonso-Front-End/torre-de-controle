/**
 * URL base da API (servidor Python).
 * Em produção (executável), usa http://127.0.0.1:8000
 * Em desenvolvimento, usa http://localhost:8000 ou VITE_API_URL do .env
 */
const API_BASE = import.meta.env.PROD 
  ? 'http://127.0.0.1:8000'
  : (import.meta.env.VITE_API_URL || 'http://localhost:8000')

/** IDs fixos (1–20) por tabela/tela; servidor exige header X-Table-Id nas rotas por tabela. */
export const TABLE_ID = {
  LISTA_TELEFONES: 1,
  VERIFICAR_PEDIDOS: 2,
  CONSULTAR_PEDIDOS: 3,
  RESULTADOS_CONSULTA: 4,
  SLA: 5,
}

/** Chamado quando a API retorna 401 (token expirado/inválido). Regulado pelo App. */
let onUnauthorized = null

/**
 * Regista o callback a executar em 401 (ex.: logout + redirect para login).
 * @param {(() => void) | null} fn
 */
export function setOnUnauthorized(fn) {
  onUnauthorized = fn
}

/**
 * Faz requisição à API e trata erros de resposta.
 * Em 401, chama onUnauthorized (se definido) e depois lança erro.
 * @param {string} path - Ex: '/api/auth/login'
 * @param {object} options - Opções do fetch (method, body, headers)
 * @param {string} [token] - JWT (Bearer) para rotas protegidas
 * @param {number} [tableId] - ID da tabela (1–20); envia header X-Table-Id
 * @returns {Promise<object>} - JSON da resposta
 * @throws {Error} - Mensagem do servidor (detail) ou erro de rede
 */
async function request(path, options = {}, token, tableId) {
  const url = `${API_BASE}${path}`
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (tableId != null) headers['X-Table-Id'] = String(tableId)
  
  let res
  try {
    res = await fetch(url, { ...options, headers })
  } catch (err) {
    throw new Error(`Erro de rede: ${err.message || 'Não foi possível conectar ao servidor'}`)
  }
  
  let data = {}
  let responseText = ''
  try {
    responseText = await res.text()
    if (responseText) {
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        // Se não for JSON válido, logar o erro e o texto
        console.error(`[api.request] Erro ao fazer parse JSON em ${path}:`, parseError)
        console.error(`[api.request] Texto da resposta:`, responseText.substring(0, 500))
        // Tentar retornar objeto vazio mas logar o problema
        data = {}
      }
    }
  } catch (textError) {
    console.error(`[api.request] Erro ao ler resposta de ${path}:`, textError)
    data = {}
  }
  
  if (!res.ok) {
    if (res.status === 401 && typeof onUnauthorized === 'function') {
      onUnauthorized()
    }
    const message = data.detail || data.message || (res.status === 401 ? 'Sessão expirada. Faça login novamente.' : `Erro ${res.status}`)
    throw new Error(typeof message === 'string' ? message : message[0]?.msg || JSON.stringify(message))
  }
  
  // Debug: log da resposta para rotas específicas
  if (path.includes('/importe-tabela-sla') || path.includes('/lista-telefones')) {
    console.log(`[api.request] ${path}:`, {
      status: res.status,
      contentType: res.headers.get('content-type'),
      textLength: responseText.length,
      textPreview: responseText.substring(0, 200),
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      dataLength: data?.data?.length ?? 0,
      total: data?.total ?? undefined,
      fullData: data
    })
  }
  
  return data || {}
}

/**
 * Login: nome e senha.
 * @returns {Promise<{ access_token: string, token_type: string }>}
 */
export async function login(nome, senha) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ nome, senha }),
  })
}

/**
 * Criar conta: nome, nome_base, senha.
 * @returns {Promise<{ id: string, nome: string, nome_base: string }>}
 */
export async function criarConta(nome, nome_base, senha) {
  return request('/api/auth/criar-conta', {
    method: 'POST',
    body: JSON.stringify({ nome, nome_base, senha }),
  })
}

/**
 * Atualiza a foto do perfil do usuário logado.
 * @param {string} token - JWT (Bearer)
 * @param {string} foto - URL da imagem
 * @returns {Promise<{ nome: string, foto: string | null }>}
 */
export async function updatePerfil(token, foto) {
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  return request('/api/auth/perfil', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ foto }),
  })
}

/**
 * Retorna dados do usuário logado (nome, foto, config).
 * @param {string} token - JWT (Bearer)
 * @returns {Promise<{ nome: string, foto: string | null, config: object }>}
 */
export async function getMe(token) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
}

/**
 * Atualiza a config do usuário. O objeto é mesclado com a config existente no servidor.
 * @param {string} token - JWT (Bearer)
 * @param {object} config - Chaves/valores a salvar (ex.: { tema: 'escuro', linhas_por_pagina: 50 })
 * @returns {Promise<{ config: object }>}
 */
export async function updateConfig(token, config) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/auth/config', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ config }),
  })
}

/**
 * Função auxiliar para processar respostas de upload (FormData)
 */
async function handleUploadResponse(res) {
  let data = {}
  try {
    const text = await res.text()
    if (text) {
      data = JSON.parse(text)
    }
  } catch {
    data = {}
  }
  
  if (!res.ok) {
    if (res.status === 401 && typeof onUnauthorized === 'function') onUnauthorized()
    const message = data.detail || data.message || `Erro ${res.status}`
    throw new Error(typeof message === 'string' ? message : message[0]?.msg || JSON.stringify(message))
  }
  
  return data || {}
}

/**
 * Envia arquivo Excel para o backend. O backend processa e salva na coleção. Requer autenticação.
 * @param {string} token - JWT (Bearer)
 * @param {File} file - Arquivo .xlsx
 * @returns {Promise<{ saved: number, data: Array<{ _id: string, values: string[] }> }>}
 */
export async function salvarListaTelefones(token, file) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const url = `${API_BASE}/api/lista-telefones`
  const form = new FormData()
  form.append('file', file)
  
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Table-Id': String(TABLE_ID.LISTA_TELEFONES),
      },
    })
  } catch (err) {
    throw new Error(`Erro de rede: ${err.message || 'Não foi possível conectar ao servidor'}`)
  }
  
  return handleUploadResponse(res)
}

/**
 * Lista datas de importação disponíveis (lista de telefones). Requer autenticação.
 * @param {string} token - JWT (Bearer)
 * @returns {Promise<{ datas: string[] }>}
 */
export async function getListaTelefonesDatas(token) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/lista-telefones/datas', { method: 'GET' }, token, TABLE_ID.LISTA_TELEFONES)
}

/**
 * Lista todos os registros da coleção lista_telefones. Requer autenticação.
 * @param {string} token - JWT (Bearer)
 * @param {string[]} [datas] - Datas de importação para filtrar (ex: ['2026-02-08'])
 * @returns {Promise<{ data: Array<{ _id: string, values: string[] }> }>}
 */
export async function getListaTelefones(token, datas = null) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const params = new URLSearchParams()
  if (Array.isArray(datas) && datas.length > 0) params.set('datas', datas.join(','))
  const qs = params.toString()
  return request(`/api/lista-telefones${qs ? `?${qs}` : ''}`, { method: 'GET' }, token, TABLE_ID.LISTA_TELEFONES)
}

/**
 * Remove todos os registros da coleção lista_telefones.
 * Exige token e senha do usuário logado (histórico de delete é gravado no backend).
 * @param {string} token - JWT (Bearer)
 * @param {string} senha - Senha do usuário para confirmar
 * @returns {Promise<{ deleted: number }>}
 */
export async function deleteListaTelefones(token, senha) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/lista-telefones', {
    method: 'DELETE',
    body: JSON.stringify({ senha }),
  }, token, TABLE_ID.LISTA_TELEFONES)
}

/**
 * Remove um registro da lista_telefones pelo _id.
 * Exige token e senha do usuário logado (histórico de delete é gravado no backend).
 * @param {string} token - JWT (Bearer)
 * @param {string} id - _id do documento
 * @param {string} senha - Senha do usuário para confirmar
 * @returns {Promise<{ deleted: number }>}
 */
export async function deleteListaTelefonesRow(token, id, senha) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request(`/api/lista-telefones/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ senha }),
  }, token, TABLE_ID.LISTA_TELEFONES)
}

/**
 * Atualiza todos os registros em que a coluna (colIndex) tem um dos valorAtuais
 * (ex.: ["   BNU -SC", "BNU -SC"]), substituindo por valorNovo. Requer autenticação.
 * @param {string} token - JWT (Bearer)
 * @param {number} colIndex - Índice da coluna (ex.: HUB)
 * @param {string[]} valorAtuais - Valores brutos a substituir (com/sem espaços)
 * @param {string} valorNovo - Novo valor (ex.: "BNU SC")
 * @returns {Promise<{ updated: number }>}
 */
export async function updateListaTelefonesHub(token, colIndex, valorAtuais, valorNovo) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const list = Array.isArray(valorAtuais) ? valorAtuais.map((v) => String(v ?? '')) : []
  return request('/api/lista-telefones', {
    method: 'PATCH',
    body: JSON.stringify({
      col_index: colIndex,
      valor_atuais: list,
      valor_novo: String(valorNovo ?? ''),
    }),
  }, token, TABLE_ID.LISTA_TELEFONES)
}

/**
 * Busca o contato (telefone) na lista_telefones por motorista e base (Responsável pela entrega = Motorista, Base = HUB).
 * @param {string} token - JWT (Bearer)
 * @param {string} motorista - Nome do motorista (Responsável pela entrega)
 * @param {string} base - Base de entrega (HUB)
 * @returns {Promise<{ contato: string, _id: string | null }>}
 */
export async function getContatoListaTelefones(token, motorista, base) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const params = new URLSearchParams()
  if (motorista != null && String(motorista).trim() !== '') params.set('motorista', String(motorista).trim())
  if (base != null && String(base).trim() !== '') params.set('base', String(base).trim())
  const qs = params.toString()
  return request(`/api/lista-telefones/contato${qs ? `?${qs}` : ''}`, { method: 'GET' }, token, TABLE_ID.LISTA_TELEFONES)
}

/**
 * Atualiza o campo Contato de um registro da lista_telefones por _id.
 * @param {string} token - JWT (Bearer)
 * @param {string} docId - _id do documento
 * @param {string} contato - Novo número (será formatado no frontend antes de enviar)
 * @returns {Promise<{ updated: number }>}
 */
export async function updateContatoListaTelefones(token, docId, contato) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/lista-telefones/contato', {
    method: 'PATCH',
    body: JSON.stringify({ doc_id: docId, contato: String(contato ?? '') }),
  }, token, TABLE_ID.LISTA_TELEFONES)
}

/**
 * Cria ou atualiza o contato para motorista + base na lista_telefones.
 * Se não existir linha com esse Motorista e HUB, insere nova (Data, Motorista, Status, Cidade, HUB, Contato).
 * @param {string} token - JWT
 * @param {string} motorista - Nome do motorista
 * @param {string} base - HUB / base
 * @param {string} contato - Número de telefone
 * @returns {Promise<{ created: boolean, _id: string }>}
 */
export async function upsertContatoListaTelefones(token, motorista, base, contato) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/lista-telefones/contato', {
    method: 'PUT',
    body: JSON.stringify({
      motorista: String(motorista ?? '').trim(),
      base: String(base ?? '').trim(),
      contato: String(contato ?? '').trim(),
    }),
  }, token, TABLE_ID.LISTA_TELEFONES)
}

/* ----- Verificar pedidos (rota separada, paginação no servidor) ----- */

/**
 * Envia arquivo Excel para o backend. Salva na coleção pedidos em lotes. Requer autenticação.
 * @param {string} token - JWT (Bearer)
 * @param {File} file - Arquivo .xlsx
 * @returns {Promise<{ saved: number }>}
 */
export async function salvarPedidos(token, file) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const url = `${API_BASE}/api/importe-tabela-pedidos`
  const form = new FormData()
  form.append('file', file)
  
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Table-Id': String(TABLE_ID.VERIFICAR_PEDIDOS),
      },
    })
  } catch (err) {
    throw new Error(`Erro de rede: ${err.message || 'Não foi possível conectar ao servidor'}`)
  }
  
  return handleUploadResponse(res)
}

/**
 * Lista datas de importação disponíveis (pedidos). Requer autenticação.
 * @param {string} token - JWT (Bearer)
 * @returns {Promise<{ datas: string[] }>}
 */
export async function getPedidosDatas(token) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/importe-tabela-pedidos/datas', { method: 'GET' }, token, TABLE_ID.VERIFICAR_PEDIDOS)
}

/**
 * Lista pedidos com paginação (suporta grandes volumes). Requer autenticação.
 * @param {string} token - JWT (Bearer)
 * @param {number} page - Página (1-based)
 * @param {number} perPage - Linhas por página
 * @param {string[]} [datas] - Datas de importação (ex: ['2026-02-08','2026-02-09']) para filtrar
 * @returns {Promise<{ data: Array<{ _id: string, values: string[] }>, total: number, header?: string[] }>}
 */
export async function getPedidos(token, page = 1, perPage = 100, datas = null) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (Array.isArray(datas) && datas.length > 0) {
    params.set('datas', datas.join(','))
  }
  return request(`/api/importe-tabela-pedidos?${params}`, { method: 'GET' }, token, TABLE_ID.VERIFICAR_PEDIDOS)
}

/**
 * Remove todos os registros da coleção pedidos. Requer autenticação.
 * @param {string} token - JWT (Bearer)
 * @returns {Promise<{ deleted: number }>}
 */
export async function deletePedidos(token) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/importe-tabela-pedidos', { method: 'DELETE' }, token, TABLE_ID.VERIFICAR_PEDIDOS)
}

/**
 * Remove um registro da coleção pedidos pelo _id. Requer autenticação.
 * @param {string} token - JWT (Bearer)
 * @param {string} id - _id do documento
 * @returns {Promise<{ deleted: number }>}
 */
export async function deletePedidosRow(token, id) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request(`/api/importe-tabela-pedidos/${encodeURIComponent(id)}`, { method: 'DELETE' }, token, TABLE_ID.VERIFICAR_PEDIDOS)
}

/* ----- Pedidos consultados (coleção pedidos_consultados) ----- */

/**
 * Importa arquivo Excel para a coleção pedidos_consultados. Requer autenticação.
 * @param {string} token - JWT (Bearer)
 * @param {File} file - Arquivo .xlsx
 * @returns {Promise<{ saved: number }>}
 */
export async function importarPedidosConsultados(token, file) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const url = `${API_BASE}/api/importe-tabela-consulta-bipagems`
  const form = new FormData()
  form.append('file', file)
  
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Table-Id': String(TABLE_ID.CONSULTAR_PEDIDOS),
      },
    })
  } catch (err) {
    throw new Error(`Erro de rede: ${err.message || 'Não foi possível conectar ao servidor'}`)
  }
  
  return handleUploadResponse(res)
}

/**
 * Lista datas de importação disponíveis (pedidos consultados). Requer autenticação.
 * @param {string} token - JWT (Bearer)
 * @returns {Promise<{ datas: string[] }>}
 */
export async function getPedidosConsultadosDatas(token) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/importe-tabela-consulta-bipagems/datas', { method: 'GET' }, token, TABLE_ID.CONSULTAR_PEDIDOS)
}

/**
 * Retorna o total de registros na coleção pedidos_consultados. Requer autenticação.
 * @param {string} token - JWT (Bearer)
 * @param {string[]} [datas] - Datas de importação para filtrar
 * @returns {Promise<{ total: number }>}
 */
export async function getPedidosConsultadosTotal(token, datas = null) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const params = new URLSearchParams()
  if (Array.isArray(datas) && datas.length > 0) params.set('datas', datas.join(','))
  const qs = params.toString()
  return request(`/api/importe-tabela-consulta-bipagems${qs ? `?${qs}` : ''}`, { method: 'GET' }, token, TABLE_ID.CONSULTAR_PEDIDOS)
}

/**
 * Remove todos os registros da coleção pedidos_consultados. Requer autenticação.
 * @param {string} token - JWT (Bearer)
 * @returns {Promise<{ deleted: number }>}
 */
export async function deletePedidosConsultados(token) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/importe-tabela-consulta-bipagems', { method: 'DELETE' }, token, TABLE_ID.CONSULTAR_PEDIDOS)
}

/* ----- Pedidos com status (dados do import pedidos-consultados) ----- */

/**
 * No-op no backend: os dados já vêm do import. Retorna total para compatibilidade.
 * @param {string} token - JWT (Bearer)
 * @returns {Promise<{ saved: number }>}
 */
export async function processarPedidosComStatus(token) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/pedidos-status/processar', { method: 'POST' }, token, TABLE_ID.CONSULTAR_PEDIDOS)
}

/**
 * Lista pedidos_com_status com paginação (dados importados em pedidos-consultados).
 * @param {string} token - JWT (Bearer)
 * @param {number} page
 * @param {number} perPage
 * @param {string[]} [datas] - Datas de importação para filtrar
 * @returns {Promise<{ data: Array<{ _id: string, values: string[], status: string }>, total: number, header: string[] }>}
 */
export async function getPedidosComStatus(token, page = 1, perPage = 100, datas = null) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (Array.isArray(datas) && datas.length > 0) params.set('datas', datas.join(','))
  return request(`/api/pedidos-status?${params}`, { method: 'GET' }, token, TABLE_ID.CONSULTAR_PEDIDOS)
}

/**
 * Remove todos os registros da coleção pedidos_com_status.
 * @param {string} token - JWT (Bearer)
 * @returns {Promise<{ deleted: number }>}
 */
export async function deletePedidosComStatus(token) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/pedidos-status', { method: 'DELETE' }, token, TABLE_ID.CONSULTAR_PEDIDOS)
}

/* ----- Resultados da consulta (base / motorista) ----- */

/**
 * Envia números de pedido JMS para processar e gravar na coleção base ou motorista.
 * @param {string} token - JWT (Bearer)
 * @param {string[]} numerosJms - Lista de números de pedido JMS
 * @param {string} colecao - "base" ou "motorista"
 * @returns {Promise<{ saved: number, skipped?: number, message?: string }>}
 */
export async function processarResultadosConsulta(token, numerosJms, colecao = 'motorista') {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/resultados-consulta/processar', {
    method: 'POST',
    body: JSON.stringify({ numeros_jms: numerosJms, colecao }),
  }, token, TABLE_ID.RESULTADOS_CONSULTA)
}

/**
 * Envio automático para motorista: usa a config do utilizador (tipos_bipagem_motorista)
 * e envia para a coleção motorista todos os pedidos cujo Tipo de bipagem está nessa lista.
 * @param {string} token - JWT (Bearer)
 * @returns {Promise<{ saved: number, skipped?: number, message?: string }>}
 */
export async function autoEnviarMotorista(token) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/resultados-consulta/auto-enviar-motorista', { method: 'POST' }, token, TABLE_ID.RESULTADOS_CONSULTA)
}

/**
 * Lista datas de importação disponíveis na coleção motorista (data do envio).
 * @param {string} token - JWT (Bearer)
 * @returns {Promise<{ datas: string[] }>}
 */
export async function getResultadosConsultaMotoristaDatas(token) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/resultados-consulta/motorista/datas', { method: 'GET' }, token, TABLE_ID.RESULTADOS_CONSULTA)
}

/**
 * Lista documentos da coleção motorista com paginação.
 * @param {string} token - JWT (Bearer)
 * @param {number} page
 * @param {number} perPage
 * @param {string[]} [datas] - Datas de importação para filtrar (ex: ['2026-02-08'])
 * @param {boolean} [incluirNaoEntreguesOutrasDatas] - Se true, inclui docs de outras datas com Marca de assinatura = "Não entregue"
 * @returns {Promise<{ data: Array<object>, total: number }>}
 */
export async function getResultadosConsultaMotorista(token, page = 1, perPage = 100, datas = null, incluirNaoEntreguesOutrasDatas = false) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (Array.isArray(datas) && datas.length > 0) params.set('datas', datas.join(','))
  if (incluirNaoEntreguesOutrasDatas) params.set('incluir_nao_entregues_outras_datas', 'true')
  const qs = params.toString()
  return request(`/api/resultados-consulta/motorista?${qs}`, { method: 'GET' }, token, TABLE_ID.RESULTADOS_CONSULTA)
}

/**
 * Retorna todos os "Número de pedido JMS" da coleção motorista.
 * @param {string} token - JWT (Bearer)
 * @param {string[]} [datas] - Datas de importação para filtrar
 * @returns {Promise<{ numeros: string[] }>}
 */
export async function getResultadosConsultaMotoristaNumerosJms(token, datas = null) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const params = new URLSearchParams()
  if (Array.isArray(datas) && datas.length > 0) params.set('datas', datas.join(','))
  const qs = params.toString()
  return request(`/api/resultados-consulta/motorista/numeros-jms${qs ? `?${qs}` : ''}`, { method: 'GET' }, token, TABLE_ID.RESULTADOS_CONSULTA)
}

/**
 * Atualiza documentos da coleção motorista a partir de um arquivo Excel (.xlsx).
 * Para cada linha com "Número de pedido JMS" existente na coleção e "Marca de assinatura"
 * igual a "Recebimento com assinatura normal" ou "Assinatura de devolução", atualiza o documento.
 * @param {string} token - JWT (Bearer)
 * @param {File} file - Arquivo .xlsx
 * @returns {Promise<{ updated: number }>}
 */
export async function updateResultadosConsultaMotorista(token, file) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const url = `${API_BASE}/api/resultados-consulta/motorista/atualizar`
  const form = new FormData()
  form.append('file', file)
  
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Table-Id': String(TABLE_ID.RESULTADOS_CONSULTA),
      },
    })
  } catch (err) {
    throw new Error(`Erro de rede: ${err.message || 'Não foi possível conectar ao servidor'}`)
  }
  
  return handleUploadResponse(res)
}

/**
 * Remove todos os documentos da coleção motorista.
 * @param {string} token - JWT (Bearer)
 * @returns {Promise<{ deleted: number }>}
 */
export async function deleteResultadosConsultaMotorista(token) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/resultados-consulta/motorista', { method: 'DELETE' }, token, TABLE_ID.RESULTADOS_CONSULTA)
}

/* ----- SLA (importe tabela SLA – grandes volumes, paginação no servidor) ----- */

/**
 * Envia arquivo Excel para o backend. Salva na coleção sla_tabela em lotes.
 * @param {string} token - JWT (Bearer)
 * @param {File} file - Arquivo .xlsx
 * @returns {Promise<{ saved: number }>}
 */
export async function salvarSLATabela(token, file) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const url = `${API_BASE}/api/importe-tabela-sla`
  const form = new FormData()
  form.append('file', file)
  
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Table-Id': String(TABLE_ID.SLA),
      },
    })
  } catch (err) {
    throw new Error(`Erro de rede: ${err.message || 'Não foi possível conectar ao servidor'}`)
  }
  
  return handleUploadResponse(res)
}

/**
 * Atualiza a tabela SLA com um Excel: atualiza linhas existentes (por número de pedido JMS)
 * e insere as novas (ex.: novos motoristas).
 * @param {string} token - JWT (Bearer)
 * @param {File} file - Arquivo .xlsx
 * @returns {Promise<{ updated: number, inserted: number }>}
 */
export async function atualizarSLATabela(token, file) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const url = `${API_BASE}/api/importe-tabela-sla/atualizar`
  const form = new FormData()
  form.append('file', file)
  
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Table-Id': String(TABLE_ID.SLA),
      },
    })
  } catch (err) {
    throw new Error(`Erro de rede: ${err.message || 'Não foi possível conectar ao servidor'}`)
  }
  
  return handleUploadResponse(res)
}

/**
 * Envia arquivo Excel de entrada no galpão para o backend. Salva na coleção entrada_no_galpao.
 * @param {string} token - JWT (Bearer)
 * @param {File} file - Arquivo .xlsx
 * @returns {Promise<{ saved: number }>}
 */
export async function salvarEntradaGalpao(token, file) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const url = `${API_BASE}/api/importe-tabela-sla/entrada-galpao`
  const form = new FormData()
  form.append('file', file)
  
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Table-Id': String(TABLE_ID.SLA),
      },
    })
  } catch (err) {
    throw new Error(`Erro de rede: ${err.message || 'Não foi possível conectar ao servidor'}`)
  }
  
  return handleUploadResponse(res)
}

/**
 * Lista datas de importação disponíveis (SLA).
 * @param {string} token - JWT (Bearer)
 * @returns {Promise<{ datas: string[] }>}
 */
export async function getSLADatas(token) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/importe-tabela-sla/datas', { method: 'GET' }, token, TABLE_ID.SLA)
}

/**
 * Lista registros SLA com paginação (suporta grandes volumes).
 * @param {string} token - JWT (Bearer)
 * @param {number} page - Página (1-based)
 * @param {number} perPage - Linhas por página
 * @param {string[]} [datas] - Datas de importação para filtrar
 * @returns {Promise<{ data: Array<{ _id: string, values: string[] }>, total: number, header?: string[] }>}
 */
export async function getSLATabela(token, page = 1, perPage = 100, datas = null) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (Array.isArray(datas) && datas.length > 0) params.set('datas', datas.join(','))
  return request(`/api/importe-tabela-sla?${params}`, { method: 'GET' }, token, TABLE_ID.SLA)
}

/**
 * Remove todos os registros da coleção SLA.
 * @param {string} token - JWT (Bearer)
 * @returns {Promise<{ deleted: number }>}
 */
export async function deleteSLATabela(token) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request('/api/importe-tabela-sla', { method: 'DELETE' }, token, TABLE_ID.SLA)
}

/**
 * Remove um registro SLA pelo _id.
 * @param {string} token - JWT (Bearer)
 * @param {string} id - _id do documento
 * @returns {Promise<{ deleted: number }>}
 */
export async function deleteSLATabelaRow(token, id) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return request(`/api/importe-tabela-sla/${encodeURIComponent(id)}`, { method: 'DELETE' }, token, TABLE_ID.SLA)
}

/**
 * Indicadores de SLA agrupados por base e por motorista.
 * @param {string} token - JWT (Bearer)
 * @param {string[]} [datas] - Datas de importação para filtrar
 * @param {string[]} [bases] - Bases de entrega para filtrar (só motoristas dessas bases)
 * @param {string} [periodo] - "AM" ou "PM" para filtrar por período (Horário de saída para entrega); omitir = Todos
 * @param {string[]} [cidades] - Cidades destino para filtrar (quando existe coluna); omitir = todas
 * @returns {Promise<{ porBase: Array<...>, porMotorista: Array<...> }>}
 */
export async function getSLAIndicadores(token, datas = null, bases = null, periodo = null, cidades = null) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const params = new URLSearchParams()
  if (Array.isArray(datas) && datas.length > 0) params.set('datas', datas.join(','))
  if (Array.isArray(bases) && bases.length > 0) params.set('bases', bases.join(','))
  if (periodo === 'AM' || periodo === 'PM') params.set('periodo', periodo)
  if (Array.isArray(cidades) && cidades.length > 0) params.set('cidades', cidades.join(','))
  const qs = params.toString()
  return request(`/api/importe-tabela-sla/indicadores${qs ? `?${qs}` : ''}`, { method: 'GET' }, token, TABLE_ID.SLA)
}

/**
 * Lista pedidos não entregues de um motorista numa base (para o modal ao clicar na coluna Não entregues).
 * @param {string} token - JWT (Bearer)
 * @param {object} opts - motorista, base, datas[] (opcional), periodo (opcional), cidades[] (opcional)
 * @returns {Promise<{ data: Array<{ _id: string, values: string[], importDate?: string }>, header: string[] }>}
 */
export async function getSLANaoEntregues(token, opts) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const { motorista, base, datas = null, periodo = null, cidades = null } = opts || {}
  const params = new URLSearchParams()
  if (motorista != null && String(motorista).trim() !== '') params.set('motorista', String(motorista).trim())
  if (base != null && String(base).trim() !== '') params.set('base', String(base).trim())
  if (Array.isArray(datas) && datas.length > 0) params.set('datas', datas.join(','))
  if (periodo === 'AM' || periodo === 'PM') params.set('periodo', periodo)
  if (Array.isArray(cidades) && cidades.length > 0) params.set('cidades', cidades.join(','))
  const qs = params.toString()
  return request(`/api/importe-tabela-sla/nao-entregues?${qs}`, { method: 'GET' }, token, TABLE_ID.SLA)
}

/**
 * Lista pedidos de entrada no galpão (não expedido) de um motorista numa base.
 * @param {string} token - JWT (Bearer)
 * @param {object} opts - motorista, base, datas[] (opcional), periodo (opcional), cidades[] (opcional)
 * @returns {Promise<{ data: Array<{ _id: string, values: string[], importDate?: string }>, header: string[] }>}
 */
export async function getSLAEntradaGalpao(token, opts) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const { motorista, base, datas = null, periodo = null, cidades = null } = opts || {}
  const params = new URLSearchParams()
  if (motorista != null && String(motorista).trim() !== '') params.set('motorista', String(motorista).trim())
  if (base != null && String(base).trim() !== '') params.set('base', String(base).trim())
  if (Array.isArray(datas) && datas.length > 0) params.set('datas', datas.join(','))
  if (periodo === 'AM' || periodo === 'PM') params.set('periodo', periodo)
  if (Array.isArray(cidades) && cidades.length > 0) params.set('cidades', cidades.join(','))
  const qs = params.toString()
  return request(`/api/importe-tabela-sla/entrada-galpao?${qs}`, { method: 'GET' }, token, TABLE_ID.SLA)
}

/**
 * Lista pedidos entregues de um motorista numa base.
 * @param {string} token - JWT (Bearer)
 * @param {object} opts - motorista, base, datas[] (opcional), periodo (opcional), cidades[] (opcional)
 * @returns {Promise<{ data: Array<{ _id: string, values: string[], importDate?: string }>, header: string[] }>}
 */
export async function getSLAEntregues(token, opts) {
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  const { motorista, base, datas = null, periodo = null, cidades = null } = opts || {}
  const params = new URLSearchParams()
  if (motorista != null && String(motorista).trim() !== '') params.set('motorista', String(motorista).trim())
  if (base != null && String(base).trim() !== '') params.set('base', String(base).trim())
  if (Array.isArray(datas) && datas.length > 0) params.set('datas', datas.join(','))
  if (periodo === 'AM' || periodo === 'PM') params.set('periodo', periodo)
  if (Array.isArray(cidades) && cidades.length > 0) params.set('cidades', cidades.join(','))
  const qs = params.toString()
  return request(`/api/importe-tabela-sla/entregues?${qs}`, { method: 'GET' }, token, TABLE_ID.SLA)
}

/**
 * Verifica se há uma nova versão disponível no GitHub.
 * Não requer autenticação.
 * @returns {Promise<{ has_update: boolean, version?: string, tag_name?: string, html_url?: string, name?: string }>}
 */
export async function getCheckUpdate() {
  return request('/api/check-update', { method: 'GET' })
}
