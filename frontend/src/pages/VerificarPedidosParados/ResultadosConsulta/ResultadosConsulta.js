/**
 * Constantes e funções puras da página Resultados da consulta.
 */

export const VALID_ROWS_PER_PAGE = [10, 25, 50, 100, 200]
export const CORREIO_KEY = 'Correio de coleta ou entrega'
export const SELECTED_ENTREGADOR_STORAGE_KEY = 'resultados-consulta-selected-entregador'
/** Preferência do filtro no modal do entregador: 'entregues' | 'naoEntregues' */
export const MODAL_FILTER_STORAGE_KEY = 'resultados-consulta-modal-filter'
/** Datas selecionadas no filtro (array YYYY-MM-DD); persistido em localStorage */
export const RESULTADOS_DATAS_STORAGE_KEY = 'resultados-consulta-selected-datas'
/** Datas selecionadas na página Evolução (array YYYY-MM-DD); persistido em localStorage */
export const EVOLUCAO_DATAS_STORAGE_KEY = 'evolucao-selected-datas'
export const MODAL_FILTER_ENTREGUES = 'entregues'
export const MODAL_FILTER_NAO_ENTREGUES = 'naoEntregues'
export const BASE_KEY = 'Base de entrega'
export const MARCA_KEY = 'Marca de assinatura'
export const NUMERO_JMS_KEY = 'Número de pedido JMS'
export const PER_PAGE_FETCH = 500

/** Valor de "Marca de assinatura" que indica entrega realizada */
export const MARCA_ENTREGUE = ['Recebimento com assinatura normal']
/** Valor que indica não entrega */
export const MARCA_NAO_ENTREGUE = 'Não entregue'

/** Retorna a data de hoje no fuso local (YYYY-MM-DD) para inicializar o filtro de data. */
export function getTodayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isEntregue(marca) {
  const s = String(marca ?? '').trim().toLowerCase()
  return MARCA_ENTREGUE.some((m) => m.toLowerCase() === s)
}

export function isNaoEntregue(marca) {
  return String(marca ?? '').trim() === MARCA_NAO_ENTREGUE
}

/** Colunas exibidas no modal de pedidos do entregador (ordem alinhada ao backend). */
export const MOTORISTA_COLUMNS = [
  'Número de pedido JMS',
  CORREIO_KEY,
  BASE_KEY,
  'Tipo de bipagem',
  'Tempo de digitalização',
  'Marca de assinatura',
  'Dias sem movimentação',
  'CEP destino',
  'Complemento',
  'Destinatário',
  'Cidade Destino',
  'Distrito destinatário',
  'PDD de Entrega',
  'Status',
]

/**
 * Agrupa lista de documentos motorista por Correio + Base de entrega.
 * Retorna array { correio, base, total } ordenado por total decrescente.
 */
export function groupByCorreioAndBase(docs) {
  if (!docs || docs.length === 0) return []
  const map = new Map()
  for (const doc of docs) {
    const correio = doc[CORREIO_KEY] != null ? String(doc[CORREIO_KEY]) : ''
    const base = doc[BASE_KEY] != null ? String(doc[BASE_KEY]) : ''
    const key = `${correio}\0${base}`
    const prev = map.get(key)
    if (prev) prev.total += 1
    else map.set(key, { [CORREIO_KEY]: correio, [BASE_KEY]: base, total: 1 })
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

/**
 * Converte lista agrupada (com evolucao) em header + bodyRows para DataTable (4 colunas).
 */
export function groupedToTable(grouped) {
  if (!grouped || grouped.length === 0) {
    return { headerValues: [], bodyRows: [], maxCols: 0 }
  }
  const headerValues = [CORREIO_KEY, BASE_KEY, 'Total', 'Evolução']
  const bodyRows = grouped.map((row, i) => ({
    _id: `row-${i}`,
    values: [
      row[CORREIO_KEY] ?? '',
      row[BASE_KEY] ?? '',
      String(row.total ?? 0),
      row.evolucaoDisplay ?? '',
    ],
  }))
  return { headerValues, bodyRows, maxCols: 4 }
}
