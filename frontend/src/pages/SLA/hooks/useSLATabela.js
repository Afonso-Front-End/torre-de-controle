import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNotification } from '../../../context'
import { getSLATabela, getSLADatas, deleteSLATabela, deleteSLATabelaRow } from '../../../services'

const VALID_ROWS_PER_PAGE = [10, 25, 50, 100, 200, 500]

/** Data de hoje em UTC (YYYY-MM-DD), igual ao importDate gravado no servidor. */
export function getTodayDateString() {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Hook para a tabela SLA: paginação no servidor (suporta grandes volumes).
 * SLA mostra sempre apenas dados do dia (hoje UTC). Se não houver importação hoje, fica vazio.
 * @param {string} [token] - JWT (Bearer)
 * @param {number} [initialRowsPerPage] - Linhas por página
 */
export default function useSLATabela(token, initialRowsPerPage) {
  const { showNotification } = useNotification()
  const initial = VALID_ROWS_PER_PAGE.includes(Number(initialRowsPerPage)) ? Number(initialRowsPerPage) : 100

  /** Estado para data selecionada (seleção única), inicializado com a data de hoje */
  const [selectedDatas, setSelectedDatas] = useState(() => [getTodayDateString()])
  
  /** Wrapper para setSelectedDatas que garante seleção única (sempre pega a primeira data) */
  const setSelectedDatasWrapper = useCallback((datas) => {
    // Para seleção única, sempre usar a primeira data do array ou data de hoje se vazio
    if (Array.isArray(datas) && datas.length > 0) {
      setSelectedDatas([datas[0]])
    } else {
      // Se array vazio, manter a data de hoje selecionada
      setSelectedDatas([getTodayDateString()])
    }
  }, [])
  
  /** Usar selectedDatas do estado, garantindo que sempre há pelo menos uma data */
  const datasParam = useMemo(() => {
    return selectedDatas.length > 0 ? selectedDatas : [getTodayDateString()]
  }, [selectedDatas])

  const [headerValues, setHeaderValues] = useState([])
  const [bodyRows, setBodyRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loadingLista, setLoadingLista] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deletingRowId, setDeletingRowId] = useState(null)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(initial)

  const refetchPage = useCallback(
    async (pageNum) => {
      if (!token) return
      setLoadingLista(true)
      try {
        const res = await getSLATabela(token, pageNum, rowsPerPage, datasParam)
        // Debug: verificar resposta da API
        console.log('[useSLATabela] Resposta da API:', {
          hasData: !!res.data,
          dataLength: res.data?.length ?? 0,
          total: res.total ?? 0,
          hasHeader: !!res.header,
          headerLength: res.header?.length ?? 0,
          fullResponse: res
        })
        const list = res.data || []
        const newTotal = res.total ?? 0
        setTotal(newTotal)
        if (pageNum === 1 && res.header) setHeaderValues(res.header)
        setBodyRows(list)
      } catch (err) {
        showNotification(err.message || 'Erro ao carregar dados SLA.', 'error')
      } finally {
        setLoadingLista(false)
      }
    },
    [token, rowsPerPage, showNotification, datasParam]
  )

  useEffect(() => {
    if (token) refetchPage(page)
  }, [token, page, rowsPerPage, datasParam, refetchPage])

  // Resetar página quando as datas mudarem
  useEffect(() => {
    if (page !== 1) setPage(1)
  }, [datasParam])

  const totalBody = Math.max(0, total)
  const totalPages = Math.max(1, Math.ceil(totalBody / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * rowsPerPage

  const goToPage = useCallback((p) => {
    setPage((prev) => Math.max(1, Math.min(p, totalPages)))
  }, [totalPages])

  const handleDeletar = useCallback(async () => {
    if (!token) {
      showNotification('Sessão expirada. Faça login novamente.', 'error')
      return
    }
    setDeleting(true)
    try {
      const res = await deleteSLATabela(token)
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

  const handleDeletarLinha = useCallback(
    async (id) => {
      if (!token) return
      setDeletingRowId(id)
      try {
        await deleteSLATabelaRow(token, id)
        showNotification('Linha removida.', 'success')
        await refetchPage(page)
      } catch (err) {
        showNotification(err.message || 'Erro ao remover linha.', 'error')
      } finally {
        setDeletingRowId(null)
      }
    },
    [token, showNotification, refetchPage, page]
  )

  const maxCols = headerValues.length > 0
    ? Math.max(headerValues.length, ...(bodyRows || []).map((r) => (r.values || []).length))
    : 0

  const hasData = total > 0

  return {
    hasData,
    loadingLista,
    headerValues,
    bodyRows,
    maxCols,
    start,
    totalRows: totalBody,
    totalPages,
    currentPage,
    rowsPerPage,
    setRowsPerPage,
    goToPage,
    refetchPage,
    /** Data selecionada pelo usuário (seleção única - array com uma data) */
    selectedDatas: datasParam,
    setSelectedDatas: setSelectedDatasWrapper,
    handleDeletar,
    handleDeletarLinha,
    deleting,
    deletingRowId,
    rowsPerPageOptions: VALID_ROWS_PER_PAGE,
  }
}
