/**
 * Constantes, opções e funções puras da página SLA.
 * Mantém SLA.jsx focado em estado e render.
 */

export const SLA_PAGE_TITLE = 'SLA'
export const SLA_PAGE_DESC = 'Importe uma planilha .xlsx para analisar indicadores de SLA.'
export const ACCEPTED_FILE_TYPES = '.xlsx'

/** Chaves de localStorage */
export const SLA_SORT_STORAGE_KEY = 'sla_sort'
export const SLA_BASE_FILTER_STORAGE_KEY = 'sla_base_filter'
export const SLA_ACOMPANHAMENTO_STORAGE_KEY = 'sla-acompanhamento-pct'

/** Chave na config do utilizador para tipo de acompanhamento (% SLA) */
export const CONFIG_KEY_SLA_ACOMPANHAMENTO = 'sla_acompanhamento_pct'

/** Índice da coluna % SLA na tabela (para SLAPercentCell) */
export const SLA_COL_PCT_INDEX = 5

/** Tipos válidos de exibição do % SLA (texto, circular, vertical, horizontal) */
export const VALID_TIPO_ACOMPANHAMENTO = new Set(['texto', 'circular', 'vertical', 'horizontal'])

/** Colunas válidas para ordenação */
export const VALID_SORT_BY = new Set(['nome', 'base', 'total', 'totalEntregues', 'naoEntregues', 'percentualSla'])
export const VALID_SORT_DIR = new Set(['asc', 'desc'])

/** Opções do dropdown de ordenação */
export const SORT_OPTIONS = [
  { sortBy: 'nome', sortDir: 'asc', label: 'Motorista A→Z' },
  { sortBy: 'nome', sortDir: 'desc', label: 'Motorista Z→A' },
  { sortBy: 'base', sortDir: 'asc', label: 'Base A→Z' },
  { sortBy: 'base', sortDir: 'desc', label: 'Base Z→A' },
  { sortBy: 'total', sortDir: 'desc', label: 'Total (maior)' },
  { sortBy: 'total', sortDir: 'asc', label: 'Total (menor)' },
  { sortBy: 'totalEntregues', sortDir: 'desc', label: 'Total entregues (maior)' },
  { sortBy: 'totalEntregues', sortDir: 'asc', label: 'Total entregues (menor)' },
  { sortBy: 'naoEntregues', sortDir: 'desc', label: 'Não entregues (maior)' },
  { sortBy: 'naoEntregues', sortDir: 'asc', label: 'Não entregues (menor)' },
  { sortBy: 'percentualSla', sortDir: 'desc', label: '% SLA (maior)' },
  { sortBy: 'percentualSla', sortDir: 'asc', label: '% SLA (menor)' },
]

/**
 * Lê ordenação guardada no localStorage ou devolve default (nome A→Z).
 */
export function getInitialSort() {
  try {
    const raw = localStorage.getItem(SLA_SORT_STORAGE_KEY)
    if (!raw) return { sortBy: 'nome', sortDir: 'asc' }
    const parsed = JSON.parse(raw)
    const sortBy = VALID_SORT_BY.has(parsed?.sortBy) ? parsed.sortBy : 'nome'
    const sortDir = VALID_SORT_DIR.has(parsed?.sortDir) ? parsed.sortDir : 'asc'
    return { sortBy, sortDir }
  } catch {
    return { sortBy: 'nome', sortDir: 'asc' }
  }
}

/**
 * Tipo de acompanhamento: prioridade config do servidor (user.config.sla_acompanhamento_pct),
 * depois localStorage, depois 'texto'.
 */
export function getTipoAcompanhamentoFromConfig(user) {
  const fromServer = user?.config?.[CONFIG_KEY_SLA_ACOMPANHAMENTO]
  const tipoServer = (fromServer || '').trim().toLowerCase()
  if (VALID_TIPO_ACOMPANHAMENTO.has(tipoServer)) return tipoServer
  try {
    const raw = localStorage.getItem(SLA_ACOMPANHAMENTO_STORAGE_KEY)
    const tipo = (raw || 'texto').trim().toLowerCase()
    return VALID_TIPO_ACOMPANHAMENTO.has(tipo) ? tipo : 'texto'
  } catch {
    return 'texto'
  }
}

/**
 * Aplica filtros por coluna à lista de motoristas.
 * 0=ID, 1=Motorista, 2=Base, 3=Total entregues, 4=Não entregues, 5=Total, 6=% SLA
 */
export function applyColumnFilters(list, columnFilters) {
  const colIndexes = Object.keys(columnFilters).map(Number)
  if (colIndexes.length === 0) return list
  return list.filter((m, rowIndex) => {
    const rowId = String(rowIndex + 1)
    const total = m.total ?? (m.totalEntregues + (m.naoEntregues ?? 0))
    const values = [
      m.nome,
      m.base ?? '(sem base)',
      String(m.totalEntregues),
      String(m.naoEntregues ?? 0),
      String(total),
      `${m.percentualSla}%`,
    ]
    for (const colIndex of colIndexes) {
      const selected = columnFilters[colIndex]
      if (!Array.isArray(selected) || selected.length === 0) continue
      const cellValue = colIndex === 0 ? rowId : values[colIndex - 1]
      const normalized = String(cellValue ?? '').trim().toLowerCase()
      const match = selected.some((s) => String(s).trim().toLowerCase() === normalized)
      if (!match) return false
    }
    return true
  })
}
