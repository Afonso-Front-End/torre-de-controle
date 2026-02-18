import { useState, useEffect, useRef, useCallback } from 'react'
import { useNotification } from '../../../context'
import { salvarListaTelefones, getListaTelefones, deleteListaTelefones, deleteListaTelefonesRow } from '../../../services'
import { VALID_ROWS_PER_PAGE } from '../ListaTelefones.js'

/** Cache em memória: ao sair e voltar na página, usa os dados sem refetch (sem localStorage). */
let cachedListaData = null

/**
 * @param {string} token
 * @param {number} [initialRowsPerPage]
 * @param {string[]} [selectedDatas] - Datas de importação para filtrar (YYYY-MM-DD); vazio = todas
 */
export default function useListaTelefones(token, initialRowsPerPage, selectedDatas = []) {
  const { showNotification } = useNotification()
  const inputRef = useRef(null)
  const initial = VALID_ROWS_PER_PAGE.includes(Number(initialRowsPerPage)) ? Number(initialRowsPerPage) : 100

  const [dados, setDados] = useState(() => cachedListaData ?? [])
  const [loading, setLoading] = useState(false)
  const [loadingLista, setLoadingLista] = useState(cachedListaData === null)
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [columnFilters, setColumnFilters] = useState({})
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(initial)

  const datasParam = Array.isArray(selectedDatas) && selectedDatas.length > 0 ? selectedDatas : null

  const refetchLista = useCallback(async () => {
    if (!token) return
    setLoadingLista(true)
    try {
      const res = await getListaTelefones(token, datasParam)
      // Debug: verificar resposta da API
      console.log('[useListaTelefones] Resposta da API:', {
        hasData: !!res.data,
        dataLength: res.data?.length ?? 0,
        fullResponse: res
      })
      const list = res.data || []
      setDados(list)
      cachedListaData = list
    } catch (err) {
      showNotification(err.message || 'Erro ao carregar lista.', 'error')
    } finally {
      setLoadingLista(false)
    }
  }, [token, showNotification, datasParam])

  useEffect(() => {
    if (token) refetchLista()
    else setLoadingLista(false)
  }, [token, refetchLista, datasParam])

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
        const res = await salvarListaTelefones(token, file)
        showNotification(`${res.saved || 0} linha(s) salva(s).`, 'success')
        await refetchLista()
      } catch (err) {
        showNotification(err.message || 'Erro ao processar o Excel.', 'error')
      } finally {
        setLoading(false)
        e.target.value = ''
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [token, showNotification, refetchLista]
  )

  const handleDeletar = useCallback(
    async (senha) => {
      if (!token) {
        showNotification('Sessão expirada. Faça login novamente.', 'error')
        return
      }
      setDeleting(true)
      try {
        const res = await deleteListaTelefones(token, senha)
        cachedListaData = []
        setDados([])
        showNotification(`${res.deleted ?? 0} registro(s) removido(s).`, 'success')
      } catch (err) {
        showNotification(err.message || 'Erro ao apagar dados.', 'error')
        throw err
      } finally {
        setDeleting(false)
      }
    },
    [token, showNotification]
  )

  const handleDeletarLinha = useCallback(
    async (id, senha) => {
      if (!token) {
        showNotification('Sessão expirada. Faça login novamente.', 'error')
        return
      }
      try {
        await deleteListaTelefonesRow(token, id, senha)
        showNotification('Linha removida.', 'success')
        refetchLista()
      } catch (err) {
        showNotification(err.message || 'Erro ao remover linha.', 'error')
        throw err
      }
    },
    [token, showNotification, refetchLista]
  )

  const maxCols =
    dados.length > 0 ? Math.max(...dados.map((d) => (d.values || []).length)) : 0
  const headerValues = dados.length > 0 ? (dados[0].values || []) : []
  const allBodyRows = dados.length > 1 ? dados.slice(1) : []

  let filteredRows = searchTerm.trim()
    ? allBodyRows.filter((item) =>
        (item.values || []).some((v) =>
          String(v).toLowerCase().includes(searchTerm.trim().toLowerCase())
        )
      )
    : allBodyRows

  const columnIndexes = Object.keys(columnFilters).map(Number)
  columnIndexes.forEach((colIndex) => {
    const selected = columnFilters[colIndex]
    if (!Array.isArray(selected) || selected.length === 0) return
    const set = new Set(selected.map((s) => String(s).trim()).filter(Boolean))
    if (set.size === 0) return
    filteredRows = filteredRows.filter((item) => {
      const cell = String(item.values?.[colIndex] ?? '').trim()
      return set.has(cell)
    })
  })

  const totalRows = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * rowsPerPage
  const bodyRows = filteredRows.slice(start, start + rowsPerPage)

  const goToPage = useCallback(
    (p) => {
      setPage(Math.max(1, Math.min(p, totalPages)))
    },
    [totalPages]
  )

  const setSearchTermAndResetPage = useCallback((value) => {
    setSearchTerm(value)
    setPage(1)
  }, [])

  const setRowsPerPageAndResetPage = useCallback((value) => {
    setRowsPerPage(value)
    setPage(1)
  }, [])

  const toggleColumnFilterValue = useCallback((colIndex, value) => {
    const trimmed = String(value ?? '').trim()
    if (!trimmed) return
    setColumnFilters((prev) => {
      const arr = Array.isArray(prev[colIndex]) ? [...prev[colIndex]] : []
      const i = arr.indexOf(trimmed)
      if (i >= 0) arr.splice(i, 1)
      else arr.push(trimmed)
      const next = { ...prev }
      next[colIndex] = arr.length ? arr : []
      if (next[colIndex].length === 0) delete next[colIndex]
      return next
    })
    setPage(1)
  }, [])

  const isColumnFilterValueSelected = useCallback(
    (colIndex, value) => {
      const arr = columnFilters[colIndex]
      return Array.isArray(arr) && arr.includes(String(value ?? '').trim())
    },
    [columnFilters]
  )

  const clearColumnFilter = useCallback((colIndex) => {
    setColumnFilters((prev) => {
      const next = { ...prev }
      delete next[colIndex]
      return next
    })
    setPage(1)
  }, [])

  /** Valores únicos da coluna (trimmed, para o dropdown). Ex.: "   BNU -SC" e "BNU -SC" viram uma opção "BNU -SC". */
  const getUniqueColumnValues = useCallback(
    (colIndex) => {
      const seen = new Set()
      allBodyRows.forEach((row) => {
        const v = row.values?.[colIndex]
        const s = String(v ?? '').trim()
        if (s) seen.add(s)
      })
      return [...seen].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    },
    [allBodyRows]
  )

  /** Valores brutos na coluna que, ao dar trim, ficam iguais a trimmedValue (para substituição HUB). */
  const getRawValuesThatTrimTo = useCallback(
    (colIndex, trimmedValue) => {
      const target = String(trimmedValue ?? '').trim()
      if (!target) return []
      const raw = new Set()
      allBodyRows.forEach((row) => {
        const v = row.values?.[colIndex]
        if (String(v ?? '').trim() === target) raw.add(String(v ?? ''))
      })
      return [...raw]
    },
    [allBodyRows]
  )

  return {
    hasData: dados.length > 0,
    loading,
    loadingLista,
    deleting,
    inputRef,
    handleArquivo,
    handleDeletar,
    handleDeletarLinha,
    searchTerm,
    setSearchTerm: setSearchTermAndResetPage,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage: setRowsPerPageAndResetPage,
    headerValues,
    maxCols,
    bodyRows,
    filteredRows,
    totalRows,
    totalPages,
    currentPage,
    start,
    goToPage,
    columnFilters,
    toggleColumnFilterValue,
    isColumnFilterValueSelected,
    clearColumnFilter,
    getUniqueColumnValues,
    getRawValuesThatTrimTo,
    refetchLista,
  }
}
