import { useState, useCallback, useEffect, useRef } from 'react'
import { useNotification } from '../../../../context'
import { salvarPedidos, getPedidos, deletePedidos, deletePedidosRow } from '../../../../services'

const VALID_ROWS_PER_PAGE = [10, 25, 50, 100, 200]

/** Cache em memória: ao sair e voltar na página, usa os dados sem refetch. */
function getCacheKey(page, rowsPerPage, datasParam) {
  return JSON.stringify([page, rowsPerPage, datasParam])
}
let cachedVerificarPedidos = null

/**
 * @param {string} token
 * @param {number} [initialRowsPerPage]
 * @param {string[]} [selectedDatas] - Datas de importação para filtrar (YYYY-MM-DD); vazio = todas
 * @param {Record<number, string[]>} [columnFilters] - Filtros por coluna; quando preenchido, carrega todos os dados e filtra no cliente
 * @param {boolean} [isFilterDropdownOpen] - Se true, carrega todos os dados para o dropdown de filtro mostrar todas as opções (ex.: todas as bases)
 */
export default function useVerificarPedidos(token, initialRowsPerPage, selectedDatas = [], columnFilters = {}, isFilterDropdownOpen = false) {
  const { showNotification } = useNotification()
  const inputRef = useRef(null)
  const initial = VALID_ROWS_PER_PAGE.includes(Number(initialRowsPerPage)) ? Number(initialRowsPerPage) : 100

  const datasParam = Array.isArray(selectedDatas) && selectedDatas.length > 0 ? selectedDatas : null
  const cacheKey = getCacheKey(1, initial, datasParam)
  const hasCache = cachedVerificarPedidos && cachedVerificarPedidos.key === cacheKey

  const [headerValues, setHeaderValues] = useState(() => (hasCache ? cachedVerificarPedidos.headerValues : []))
  const [bodyRows, setBodyRows] = useState(() => (hasCache ? cachedVerificarPedidos.bodyRows : []))
  const [total, setTotal] = useState(() => (hasCache ? cachedVerificarPedidos.total : 0))
  const [loading, setLoading] = useState(false)
  const [loadingLista, setLoadingLista] = useState(!hasCache)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(initial)

  const hasColumnFilters = Object.keys(columnFilters || {}).some(
    (k) => Array.isArray(columnFilters[k]) && columnFilters[k].length > 0
  )
  const needsFullData = hasColumnFilters || isFilterDropdownOpen

  const [fullBodyRows, setFullBodyRows] = useState(null)
  const [loadingFullData, setLoadingFullData] = useState(false)

  const headerValuesRef = useRef([])
  headerValuesRef.current = headerValues

  const refetchPage = useCallback(
    async (pageNum) => {
      if (!token) return
      setLoadingLista(true)
      try {
        const res = await getPedidos(token, pageNum, rowsPerPage, datasParam)
        const list = res.data || []
        const newTotal = res.total ?? 0
        const newHeader = pageNum === 1 && res.header ? res.header : headerValuesRef.current
        setTotal(newTotal)
        if (pageNum === 1 && res.header) setHeaderValues(res.header)
        setBodyRows(list)
        cachedVerificarPedidos = {
          key: getCacheKey(pageNum, rowsPerPage, datasParam),
          headerValues: newHeader,
          bodyRows: list,
          total: newTotal,
        }
      } catch (err) {
        showNotification(err.message || 'Erro ao carregar pedidos.', 'error')
      } finally {
        setLoadingLista(false)
      }
    },
    [token, rowsPerPage, showNotification, datasParam]
  )

  const loadAllPages = useCallback(async () => {
    if (!token) return
    setLoadingFullData(true)
    try {
      const resFirst = await getPedidos(token, 1, 500, datasParam)
      const totalFromApi = resFirst.total ?? 0
      const header = resFirst.header || headerValuesRef.current
      setTotal(totalFromApi)
      if (resFirst.header) setHeaderValues(resFirst.header)
      const totalBodyFromApi = Math.max(0, totalFromApi - 1)
      if (totalBodyFromApi === 0) {
        setFullBodyRows([])
        setBodyRows([])
        setLoadingFullData(false)
        return
      }
      const totalPagesFetch = Math.ceil(totalBodyFromApi / 500)
      const allRows = (resFirst.data || []).slice()
      for (let p = 2; p <= totalPagesFetch; p++) {
        const res = await getPedidos(token, p, 500, datasParam)
        const list = res.data || []
        allRows.push(...list)
      }
      setFullBodyRows(allRows)
    } catch (err) {
      showNotification(err.message || 'Erro ao carregar pedidos.', 'error')
      setFullBodyRows(null)
    } finally {
      setLoadingFullData(false)
    }
  }, [token, datasParam, showNotification])

  const currentKey = getCacheKey(page, rowsPerPage, datasParam)
  const needRefetch = !cachedVerificarPedidos || cachedVerificarPedidos.key !== currentKey

  useEffect(() => {
    if (!token) {
      setLoadingLista(false)
      return
    }
    if (needsFullData) {
      if (fullBodyRows === null) loadAllPages()
      return
    }
    setFullBodyRows(null)
    if (needRefetch) refetchPage(page)
  }, [token, needsFullData, needRefetch, refetchPage, loadAllPages, page, rowsPerPage, selectedDatas])

  useEffect(() => {
    if (!needsFullData && fullBodyRows !== null) setFullBodyRows(null)
  }, [needsFullData, fullBodyRows])

  useEffect(() => {
    if (needsFullData) setFullBodyRows(null)
  }, [datasParam])

  const handleArquivo = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const ext = (file.name || '').toLowerCase()
      if (!ext.endsWith('.xlsx')) {
        showNotification('Envie um arquivo Excel (.xlsx).', 'error')
        e.target.value = ''
        return
      }
      if (!token) {
        showNotification('Sessão expirada. Faça login novamente.', 'error')
        return
      }
      setLoading(true)
      try {
        const res = await salvarPedidos(token, file)
        showNotification(`${res.saved ?? 0} linha(s) salva(s).`, 'success')
        setPage(1)
        await refetchPage(1)
      } catch (err) {
        showNotification(err.message || 'Erro ao processar o Excel.', 'error')
      } finally {
        setLoading(false)
        e.target.value = ''
      }
    },
    [token, showNotification, refetchPage]
  )

  const handleDeletar = useCallback(async () => {
    if (!token) {
      showNotification('Sessão expirada. Faça login novamente.', 'error')
      return
    }
    setDeleting(true)
    try {
      const res = await deletePedidos(token)
      cachedVerificarPedidos = null
      setTotal(0)
      setHeaderValues([])
      setBodyRows([])
      setPage(1)
      showNotification(`${res.deleted ?? 0} registro(s) removido(s).`, 'success')
    } catch (err) {
      showNotification(err.message || 'Erro ao apagar dados.', 'error')
    } finally {
      setDeleting(false)
    }
  }, [token, showNotification])

  /** Verifica se uma linha passa nos filtros de coluna. colIndex 0 = ID (1-based), colIndex >= 1 = values[colIndex-1]. Comparação case-insensitive para valores de célula. */
  const rowPassesColumnFilters = useCallback(
    (row, rowIndex1Based, columnFiltersMap) => {
      const keys = Object.keys(columnFiltersMap).map(Number)
      for (const colIndex of keys) {
        const selected = columnFiltersMap[colIndex]
        if (!Array.isArray(selected) || selected.length === 0) continue
        const set = new Set(selected.map((s) => String(s).trim().toLowerCase()).filter(Boolean))
        if (set.size === 0) continue
        const cell =
          colIndex === 0
            ? String(rowIndex1Based)
            : String((row.values && row.values[colIndex - 1]) ?? '').trim().toLowerCase()
        if (!set.has(cell)) return false
      }
      return true
    },
    []
  )

  const totalBody = Math.max(0, total - 1)
  const totalPagesDefault = Math.max(1, Math.ceil(totalBody / rowsPerPage))
  const currentPageDefault = Math.min(page, totalPagesDefault)
  const startDefault = (currentPageDefault - 1) * rowsPerPage

  let bodyRowsToUse = bodyRows
  let totalRowsToUse = totalBody
  let totalPagesToUse = totalPagesDefault
  let currentPageToUse = currentPageDefault
  let startToUse = startDefault

  if (hasColumnFilters && Array.isArray(fullBodyRows)) {
    const filteredFullRows = fullBodyRows.filter((row, idx) =>
      rowPassesColumnFilters(row, idx + 1, columnFilters)
    )
    totalRowsToUse = filteredFullRows.length
    totalPagesToUse = Math.max(1, Math.ceil(totalRowsToUse / rowsPerPage))
    currentPageToUse = Math.min(page, totalPagesToUse)
    startToUse = (currentPageToUse - 1) * rowsPerPage
    bodyRowsToUse = filteredFullRows.slice(startToUse, startToUse + rowsPerPage)
  }

  const handleDeletarLinha = useCallback(
    async (id) => {
      if (!token) {
        showNotification('Sessão expirada. Faça login novamente.', 'error')
        return
      }
      try {
        await deletePedidosRow(token, id)
        showNotification('Linha removida.', 'success')
        if (hasColumnFilters) await loadAllPages()
        else await refetchPage(page)
      } catch (err) {
        showNotification(err.message || 'Erro ao remover linha.', 'error')
      }
    },
    [token, showNotification, refetchPage, loadAllPages, hasColumnFilters, page]
  )

  const goToPage = useCallback((p) => {
    setPage((prev) => Math.max(1, Math.min(p, totalPagesToUse)))
  }, [totalPagesToUse])

  const maxCols = headerValues.length > 0
    ? Math.max(headerValues.length, ...(bodyRowsToUse || []).map((r) => (r.values || []).length))
    : 0

  const hasData = total > 0

  const [loadingNumerosJMS, setLoadingNumerosJMS] = useState(false)

  const COLUNA_NUMERO_PEDIDO_JMS = 'Número de pedido JMS'

  /**
   * Retorna todos os números JMS. Se columnFilters for passado e não vazio, busca todas as páginas
   * e aplica os filtros antes de extrair os JMS (só devolve números dos pedidos filtrados).
   */
  const getAllNumerosJMS = useCallback(
    async (columnFilters = {}) => {
      const totalRegistros = Math.max(0, total - 1)
      if (totalRegistros === 0) return []
      const header = headerValues
      const idxJms = header.findIndex(
        (h) => (h && h.trim()) === COLUNA_NUMERO_PEDIDO_JMS
      )
      if (idxJms === -1) return []
      const hasFilters = Object.keys(columnFilters || {}).some(
        (k) => Array.isArray(columnFilters[k]) && columnFilters[k].length > 0
      )

      setLoadingNumerosJMS(true)
      try {
        const perPage = 500
        const totalPagesFetch = Math.ceil(totalRegistros / perPage)
        const numeros = []

        if (!hasFilters) {
          for (let p = 1; p <= totalPagesFetch; p++) {
            const res = await getPedidos(token, p, perPage, datasParam)
            const list = res.data || []
            const resHeader = res.header || header
            const idx = resHeader.findIndex(
              (h) => (h && h.trim()) === COLUNA_NUMERO_PEDIDO_JMS
            )
            if (idx === -1) break
            for (const row of list) {
              const val =
                row.values && row.values[idx]
                  ? String(row.values[idx]).trim()
                  : ''
              if (val) numeros.push(val)
            }
          }
          return numeros
        }

        let globalIndex = 1
        for (let p = 1; p <= totalPagesFetch; p++) {
          const res = await getPedidos(token, p, perPage, datasParam)
          const list = res.data || []
          for (const row of list) {
            if (rowPassesColumnFilters(row, globalIndex, columnFilters)) {
              const val =
                row.values && row.values[idxJms]
                  ? String(row.values[idxJms]).trim()
                  : ''
              if (val) numeros.push(val)
            }
            globalIndex += 1
          }
        }
        return numeros
      } finally {
        setLoadingNumerosJMS(false)
      }
    },
    [token, total, headerValues, datasParam, rowPassesColumnFilters]
  )

  return {
    hasData,
    loading,
    loadingLista,
    deleting,
    inputRef,
    handleArquivo,
    handleDeletar,
    handleDeletarLinha,
    headerValues,
    maxCols,
    bodyRows: bodyRowsToUse,
    totalRows: totalRowsToUse,
    totalPages: totalPagesToUse,
    currentPage: currentPageToUse,
    start: startToUse,
    rowsPerPage,
    setRowsPerPage,
    goToPage,
    refetchPage,
    getAllNumerosJMS,
    loadingNumerosJMS,
    fullBodyRows: needsFullData ? fullBodyRows : null,
    loadingFullData,
  }
}
