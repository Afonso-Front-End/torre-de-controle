import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { MdUpload, MdOutlineDelete, MdSettings } from 'react-icons/md'
import { useAppContext, useNotification } from '../../../context'
import { importarPedidosConsultados, getPedidosConsultadosTotal, getPedidosConsultadosDatas, deletePedidosConsultados, processarPedidosComStatus, getPedidosComStatus, deletePedidosComStatus, processarResultadosConsulta, autoEnviarMotorista } from '../../../services'
import { invalidateResultadosCache } from '../../../utils/resultadosCache'
import { VALID_ROWS_PER_PAGE, getConsultarCacheKey, consultarCache } from './ConsultarPedidos.js'
import DateFilterSelect from '../../../components/DateFilterSelect'
import DataTable from '../VerificarPedidos/DataTable'
import ConsultarPedidosConfigModal from './ConsultarPedidosConfigModal'
import './ConsultarPedidos.css'

export default function ConsultarPedidos() {
  const { user, refetchUser, setGlobalLoading } = useAppContext()
  const { showNotification } = useNotification()
  const token = user?.token
  const inputRef = useRef(null)
  const [selectedDatas, setSelectedDatas] = useState([])
  const datasParam = selectedDatas.length > 0 ? selectedDatas : null
  const cacheKey = getConsultarCacheKey(token, datasParam)
  const hasCache = consultarCache.key === cacheKey

  const [loading, setLoading] = useState(false)
  const [hasData, setHasData] = useState(() => (hasCache ? consultarCache.hasData : false))
  const [deleting, setDeleting] = useState(false)
  const [statusHeader, setStatusHeader] = useState(() => (hasCache ? consultarCache.status.header : []))
  const [statusRows, setStatusRows] = useState(() => (hasCache ? consultarCache.status.rows : []))
  const [statusTotal, setStatusTotal] = useState(() => (hasCache ? consultarCache.status.total : 0))
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [checkingData, setCheckingData] = useState(!hasCache)
  const initialRowsPerPage = VALID_ROWS_PER_PAGE.includes(Number(user?.config?.linhas_por_pagina))
    ? Number(user?.config?.linhas_por_pagina)
    : 100
  const [fullTablePage, setFullTablePage] = useState(1)
  const [fullTableRowsPerPage, setFullTableRowsPerPage] = useState(initialRowsPerPage)
  /** Filtros por coluna: { colIndex: string[] } — valores selecionados (como ListaTelefones). */
  const [columnFilters, setColumnFilters] = useState({})
  const [openFilterIndex, setOpenFilterIndex] = useState(null)
  const [filterSearchTerm, setFilterSearchTerm] = useState('')
  const [filterLoading, setFilterLoading] = useState(false)
  const filterDropdownRef = useRef(null)
  const filterLoadingTimeoutRef = useRef(null)
  /** IDs das linhas selecionadas (para enviar para base/motorista). */
  const [selectedIds, setSelectedIds] = useState([])
  /** Coleção de destino: "base" ou "motorista". */
  const [colecaoDestino, setColecaoDestino] = useState('motorista')
  const [loadingEnviar, setLoadingEnviar] = useState(false)
  const [showConfirmExcluir, setShowConfirmExcluir] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  /** Posição do dropdown de filtro (quando aberto pelo clique no th). */
  const [filterDropdownAnchorRect, setFilterDropdownAnchorRect] = useState(null)

  useEffect(() => {
    if (!token) {
      setCheckingData(false)
      return
    }
    if (consultarCache.key === cacheKey) {
      setHasData(consultarCache.hasData)
      setStatusHeader(consultarCache.status.header)
      setStatusRows(consultarCache.status.rows)
      setStatusTotal(consultarCache.status.total)
      setCheckingData(false)
      return
    }
    let cancelled = false
    setCheckingData(true)
    setGlobalLoading(true, 'A verificar dados…')
    getPedidosConsultadosTotal(token)
      .then((res) => {
        if (!cancelled && (res.total ?? 0) > 0) setHasData(true)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setCheckingData(false)
          setGlobalLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [token, cacheKey, setGlobalLoading])

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
      setGlobalLoading(true, 'A importar…')
      try {
        const res = await importarPedidosConsultados(token, file)
        const saved = res.saved ?? 0
        showNotification(`${saved} linha(s) importada(s).`, 'success')
        if (saved > 0) setHasData(true)
        if (saved > 0) {
          try {
            await processarPedidosComStatus(token)
            const autoRes = await autoEnviarMotorista(token)
            const msg = autoRes.message || `${autoRes.saved ?? 0} enviado(s) para motorista.`
            showNotification(msg, 'success')
            invalidateResultadosCache()
            refetchUser?.()
          } catch (autoErr) {
            showNotification(autoErr.message || 'Importação ok; envio automático para motorista falhou.', 'warning')
          }
        }
      } catch (err) {
        showNotification(err.message || 'Erro ao importar o ficheiro.', 'error')
      } finally {
        setLoading(false)
        setGlobalLoading(false)
        e.target.value = ''
      }
    },
    [token, showNotification, refetchUser, setGlobalLoading]
  )

  const handleExcluirTudo = useCallback(async () => {
    if (!token) {
      showNotification('Sessão expirada. Faça login novamente.', 'error')
      return
    }
    setDeleting(true)
    try {
      await deletePedidosComStatus(token)
      const res = await deletePedidosConsultados(token)
      const total = (res.deleted ?? 0)
      showNotification(total ? `${total} registro(s) excluído(s).` : 'Dados excluídos.', 'success')
      consultarCache.key = null
      consultarCache.hasData = false
      consultarCache.status = { header: [], rows: [], total: 0 }
      setHasData(false)
      setStatusTotal(0)
      setStatusRows([])
      setStatusHeader([])
    } catch (err) {
      showNotification(err.message || 'Erro ao excluir dados.', 'error')
    } finally {
      setDeleting(false)
    }
  }, [token, showNotification])

  const handleConfirmarExcluir = useCallback(() => {
    setShowConfirmExcluir(false)
    handleExcluirTudo()
  }, [handleExcluirTudo])

  const fetchFromServer = useCallback(async (doProcessar = true) => {
    if (!token) return
    const keyToCache = getConsultarCacheKey(token, datasParam)
    setLoadingStatus(true)
    setGlobalLoading(true, 'A carregar…')
    try {
      if (doProcessar) await processarPedidosComStatus(token)
      const perPage = 500
      let allRows = []
      let total = 0
      let pageNum = 1
      let header = []

      while (true) {
        const res = await getPedidosComStatus(token, pageNum, perPage, datasParam)
        total = res.total ?? 0
        if (pageNum === 1) {
          header = res.header ?? []
          setStatusHeader(header)
        }
        const chunk = (res.data || []).map((d) => ({
          _id: d._id,
          values: [...(d.values || [])],
        }))
        allRows = allRows.concat(chunk)
        if (chunk.length === 0 || allRows.length >= total) break
        pageNum += 1
      }

      setStatusTotal(total)
      setStatusRows(allRows)
      consultarCache.key = keyToCache
      consultarCache.hasData = total > 0
      consultarCache.status = { header, rows: allRows, total }
    } catch (err) {
      showNotification(err.message || 'Erro ao carregar pedidos com status.', 'error')
    } finally {
      setLoadingStatus(false)
      setGlobalLoading(false)
    }
  }, [token, showNotification, datasParam, setGlobalLoading])

  const refetchStatus = useCallback(() => fetchFromServer(true), [fetchFromServer])

  useEffect(() => {
    if (!hasData) return
    if (consultarCache.key === cacheKey) {
      setStatusHeader(consultarCache.status.header)
      setStatusRows(consultarCache.status.rows)
      setStatusTotal(consultarCache.status.total)
      return
    }
    refetchStatus()
  }, [hasData, refetchStatus, cacheKey])

  useEffect(() => {
    if (!hasData) return
    const onVisible = () => {
      fetchFromServer(false)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [hasData, fetchFromServer])

  const numFilterCols = 1 + (statusHeader?.length || 0)

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
    setFullTablePage(1)
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
    setFullTablePage(1)
  }, [])

  /** Valores únicos da coluna (para o dropdown). Col 0 = ID (1..N), col i = values[i-1]. */
  const getUniqueColumnValues = useCallback(
    (colIndex) => {
      if (colIndex === 0) {
        return Array.from({ length: statusRows.length }, (_, i) => String(i + 1))
      }
      const seen = new Set()
      statusRows.forEach((row) => {
        const v = row.values?.[colIndex - 1]
        const s = String(v ?? '').trim()
        if (s) seen.add(s)
      })
      return [...seen].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    },
    [statusRows]
  )

  // Aplicar filtros: manter linha só se cada coluna com filtro ativo tiver o valor da célula no conjunto selecionado. Comparação case-insensitive (como em Verificar pedidos).
  const columnIndexes = Object.keys(columnFilters).map(Number)
  const filteredRows = statusRows.filter((row, rowIndex) => {
    for (const colIndex of columnIndexes) {
      const selected = columnFilters[colIndex]
      if (!Array.isArray(selected) || selected.length === 0) continue
      const set = new Set(selected.map((s) => String(s).trim().toLowerCase()).filter(Boolean))
      if (set.size === 0) continue
      const cell =
        colIndex === 0
          ? String(rowIndex + 1)
          : String(row.values?.[colIndex - 1] ?? '').trim().toLowerCase()
      if (!set.has(cell)) return false
    }
    return true
  })
  const totalFiltrado = filteredRows.length
  const rowLengths = statusRows.map((r) => (r.values || []).length)
  const maxCols = Math.max(statusHeader.length, ...(rowLengths.length ? rowLengths : [0]), 1)

  /** Índice da coluna "Número de pedido JMS" no header (para enviar ao backend). */
  const idxNumeroPedidoJms = statusHeader.findIndex(
    (h) =>
      String(h || '').toLowerCase().includes('número de pedido jms') ||
      String(h || '').toLowerCase().includes('numero de pedido jms')
  )

  const filteredRowIds = useMemo(() => new Set(filteredRows.map((r) => r._id)), [filteredRows])
  const selectAllChecked = filteredRows.length > 0 && filteredRows.every((r) => selectedIds.includes(r._id))
  const selectAllIndeterminate =
    filteredRows.some((r) => selectedIds.includes(r._id)) && !selectAllChecked

  const handleSelectAllChange = useCallback(
    (checked) => {
      if (checked) {
        setSelectedIds((prev) => [...new Set([...prev, ...filteredRows.map((r) => r._id)])])
      } else {
        setSelectedIds((prev) => prev.filter((id) => !filteredRowIds.has(id)))
      }
    },
    [filteredRows, filteredRowIds]
  )

  const handleSelectionChange = useCallback((id, checked) => {
    if (checked) {
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id))
    }
  }, [])

  const handleEnviar = useCallback(async () => {
    if (!token) {
      showNotification('Sessão expirada. Faça login novamente.', 'error')
      return
    }
    const selectedRows = filteredRows.filter((r) => selectedIds.includes(r._id))
    if (selectedRows.length === 0) {
      showNotification('Selecione pelo menos uma linha para enviar.', 'warning')
      return
    }
    if (idxNumeroPedidoJms < 0) {
      showNotification('Coluna "Número de pedido JMS" não encontrada nos dados.', 'error')
      return
    }
    const numerosJms = selectedRows
      .map((r) => (r.values && r.values[idxNumeroPedidoJms] != null ? String(r.values[idxNumeroPedidoJms]).trim() : ''))
      .filter(Boolean)
    if (numerosJms.length === 0) {
      showNotification('Nenhum número de pedido JMS válido nas linhas selecionadas.', 'warning')
      return
    }
    setLoadingEnviar(true)
    try {
      const res = await processarResultadosConsulta(token, numerosJms, colecaoDestino)
      const msg = res.message || `${res.saved ?? 0} registro(s) gravado(s) na coleção ${colecaoDestino}.`
      showNotification(msg, 'success')
      setSelectedIds([])
      if (colecaoDestino === 'motorista') {
        invalidateResultadosCache()
        refetchUser?.()
      }
    } catch (err) {
      showNotification(err.message || 'Erro ao enviar.', 'error')
    } finally {
      setLoadingEnviar(false)
    }
  }, [token, showNotification, filteredRows, selectedIds, idxNumeroPedidoJms, colecaoDestino, refetchUser])

  const totalPagesFull = Math.max(1, Math.ceil(totalFiltrado / fullTableRowsPerPage))
  const currentPageFull = Math.min(Math.max(1, fullTablePage), totalPagesFull)
  const startFull = (currentPageFull - 1) * fullTableRowsPerPage
  const bodyRowsFull = filteredRows.slice(startFull, startFull + fullTableRowsPerPage)

  const goToFullTablePage = useCallback((p) => {
    setFullTablePage(Math.max(1, Math.min(p, totalPagesFull)))
  }, [totalPagesFull])

  useEffect(() => {
    setFullTablePage(1)
  }, [totalFiltrado, fullTableRowsPerPage])

  /* Fechar dropdown de filtro por coluna ao clicar fora (tabela ou dropdown). */
  useEffect(() => {
    if (openFilterIndex === null) return
    function handleClickOutside(e) {
      if (filterDropdownRef.current?.contains(e.target)) return
      if (e.target.closest('.consultar-pedidos__filter-dropdown')) return
      setOpenFilterIndex(null)
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [openFilterIndex])

  useEffect(() => {
    if (openFilterIndex === null) {
      setFilterDropdownAnchorRect(null)
      if (filterLoadingTimeoutRef.current) {
        clearTimeout(filterLoadingTimeoutRef.current)
        filterLoadingTimeoutRef.current = null
      }
    }
  }, [openFilterIndex])

  function openFilter(colIndex) {
    if (openFilterIndex === colIndex) {
      setOpenFilterIndex(null)
      if (filterLoadingTimeoutRef.current) {
        clearTimeout(filterLoadingTimeoutRef.current)
        filterLoadingTimeoutRef.current = null
      }
      setFilterLoading(false)
      return
    }
    if (filterLoadingTimeoutRef.current) {
      clearTimeout(filterLoadingTimeoutRef.current)
      filterLoadingTimeoutRef.current = null
    }
    setFilterSearchTerm('')
    setFilterLoading(true)
    setOpenFilterIndex(colIndex)
    filterLoadingTimeoutRef.current = setTimeout(() => {
      setFilterLoading(false)
      filterLoadingTimeoutRef.current = null
    }, 150)
  }

  function toggleFilterValue(colIndex, value) {
    toggleColumnFilterValue(colIndex, value)
  }

  function handleHeaderClick(filterColIndex, event) {
    const rect = event.target.getBoundingClientRect()
    if (openFilterIndex === filterColIndex) {
      setOpenFilterIndex(null)
      if (filterLoadingTimeoutRef.current) {
        clearTimeout(filterLoadingTimeoutRef.current)
        filterLoadingTimeoutRef.current = null
      }
      setFilterLoading(false)
      return
    }
    if (filterLoadingTimeoutRef.current) {
      clearTimeout(filterLoadingTimeoutRef.current)
      filterLoadingTimeoutRef.current = null
    }
    setFilterSearchTerm('')
    setFilterLoading(true)
    setFilterDropdownAnchorRect({ top: rect.bottom, left: rect.left, width: rect.width, height: rect.height })
    setOpenFilterIndex(filterColIndex)
    filterLoadingTimeoutRef.current = setTimeout(() => {
      setFilterLoading(false)
      filterLoadingTimeoutRef.current = null
    }, 150)
  }

  const filterColumnLabels = ['ID', ...(statusHeader || [])]
  const activeFilterColIndices = useMemo(() => {
    const n = 1 + (statusHeader?.length ?? 0)
    const indices = []
    for (let colIdx = 0; colIdx < n; colIdx++) {
      if ((Array.isArray(columnFilters[colIdx]) ? columnFilters[colIdx].length : 0) > 0) indices.push(colIdx)
    }
    return indices
  }, [columnFilters, statusHeader])

  if (checkingData) {
    return <div className="consultar-pedidos consultar-pedidos--with-loader" aria-busy="true" />
  }

  if (hasData) {
    return (
      <div className="consultar-pedidos consultar-pedidos--tabela consultar-pedidos--with-loader">
        <div className="consultar-pedidos__toolbar">
          <div className="consultar-pedidos__search-wrap" style={{ maxWidth: '100%' }}>
            <DateFilterSelect
              token={token}
              fetchDatas={() => getPedidosConsultadosDatas(token)}
              selectedDatas={selectedDatas}
              onChange={setSelectedDatas}
              label="Data do envio"
              disabled={deleting}
              className="consultar-pedidos__date-filter"
            />
          </div>
          <div className="consultar-pedidos__toolbar-actions">
            <button
              type="button"
              className="consultar-pedidos__btn-config"
              onClick={() => setShowConfigModal(true)}
              title="Configuração (prefixos e envio automático para motorista)"
              aria-label="Abrir configuração"
            >
              <MdSettings className="consultar-pedidos__btn-config-icon" aria-hidden />
            </button>
            <select
              className="consultar-pedidos__select-colecao"
              value={colecaoDestino}
              onChange={(e) => setColecaoDestino(e.target.value)}
              aria-label="Coleção de destino"
              title="Coleção onde gravar os pedidos selecionados"
            >
              <option value="base" disabled>Base (Em breve)</option>
              <option value="motorista">Motorista</option>
            </select>
            <button
              type="button"
              className="consultar-pedidos__btn-enviar"
              onClick={handleEnviar}
              disabled={loadingEnviar || selectedIds.length === 0}
              title={`Enviar selecionados para ${colecaoDestino}`}
              aria-label="Enviar selecionados"
            >
              {loadingEnviar ? 'A enviar…' : 'Enviar'}
            </button>
            <button
              type="button"
              className="consultar-pedidos__btn-delete"
              onClick={() => setShowConfirmExcluir(true)}
              disabled={deleting}
              title="Excluir todos os dados (pedidos consultados e com status)"
              aria-label="Excluir todos os dados"
            >
              <MdOutlineDelete className="consultar-pedidos__btn-delete-icon" />
            </button>
          </div>
        </div>
        <section className="consultar-pedidos__content">
          {statusTotal === 0 && !loadingStatus && (
            <p className="consultar-pedidos__placeholder">
              Sem dados para exibir. Os dados importados aparecerão aqui.
            </p>
          )}
          {statusTotal > 0 && (
            <>
              <div className="consultar-pedidos__table-wrap" ref={filterDropdownRef}>
                <div className="data-table consultar-pedidos__data-table consultar-pedidos__data-table--full">
                <DataTable
                onHeaderClick={handleHeaderClick}
                activeFilterColIndices={activeFilterColIndices}
                showSelectionColumn
                selectedRowIds={selectedIds}
                onSelectionChange={handleSelectionChange}
                onSelectAllChange={handleSelectAllChange}
                selectAllChecked={selectAllChecked}
                selectAllIndeterminate={selectAllIndeterminate}
                headerValues={statusHeader}
                bodyRows={bodyRowsFull}
                maxCols={maxCols}
                start={startFull}
                totalRows={totalFiltrado}
                totalPages={totalPagesFull}
                currentPage={currentPageFull}
                rowsPerPage={fullTableRowsPerPage}
                rowsPerPageOptions={VALID_ROWS_PER_PAGE}
                onRowsPerPageChange={setFullTableRowsPerPage}
                onPageChange={goToFullTablePage}
              />
                </div>
                {openFilterIndex !== null && filterDropdownAnchorRect && (
                  <div
                    className="consultar-pedidos__filter-dropdown consultar-pedidos__filter-dropdown--menu consultar-pedidos__filter-dropdown--fixed"
                    style={{
                      position: 'fixed',
                      top: filterDropdownAnchorRect.top + 2,
                      left: filterDropdownAnchorRect.left,
                      minWidth: Math.max(filterDropdownAnchorRect.width, 200),
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="consultar-pedidos__filter-dropdown-inner">
                      {filterLoading ? (
                        <div className="consultar-pedidos__filter-loading" aria-busy="true">
                          <span className="consultar-pedidos__filter-spinner" aria-hidden />
                          <span className="consultar-pedidos__filter-loading-text">Carregando…</span>
                        </div>
                      ) : (
                        <>
                          <div className="consultar-pedidos__filter-dropdown-search-wrap">
                            <input
                              type="text"
                              className="consultar-pedidos__filter-dropdown-search"
                              placeholder="Pesquisar..."
                              value={filterSearchTerm}
                              onChange={(e) => setFilterSearchTerm(e.target.value)}
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="consultar-pedidos__filter-dropdown-list">
                            <div className="consultar-pedidos__filter-menu">
                              {getUniqueColumnValues(openFilterIndex)
                                .filter((optionValue) =>
                                  String(optionValue).toLowerCase().includes(filterSearchTerm.trim().toLowerCase())
                                )
                                .map((optionValue) => {
                                  const checked = isColumnFilterValueSelected(openFilterIndex, optionValue)
                                  return (
                                    <button
                                      key={optionValue}
                                      type="button"
                                      className={`consultar-pedidos__filter-menu-item ${checked ? 'consultar-pedidos__filter-menu-item--selected' : ''}`}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        toggleFilterValue(openFilterIndex, optionValue)
                                      }}
                                    >
                                      <span className="consultar-pedidos__filter-menu-icon" aria-hidden>
                                        {checked ? (
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                                        ) : (
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                                        )}
                                      </span>
                                      <span className="consultar-pedidos__filter-menu-text">{optionValue}</span>
                                    </button>
                                  )
                                })}
                            </div>
                          </div>
                          <div className="consultar-pedidos__filter-dropdown-footer">
                            <div className="consultar-pedidos__filter-menu-separator" />
                            <button
                              type="button"
                              className="consultar-pedidos__filter-menu-item consultar-pedidos__filter-menu-item--action"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                clearColumnFilter(openFilterIndex)
                                setOpenFilterIndex(null)
                              }}
                            >
                              <span className="consultar-pedidos__filter-menu-icon" aria-hidden>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                              </span>
                              <span className="consultar-pedidos__filter-menu-text">Limpar filtro</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
        <ConsultarPedidosConfigModal
          open={showConfigModal}
          onClose={() => setShowConfigModal(false)}
        />
        {showConfirmExcluir && (
          <div
            className="consultar-pedidos__confirm-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="consultar-pedidos-confirm-title"
            onClick={() => setShowConfirmExcluir(false)}
          >
            <div className="consultar-pedidos__confirm-modal" onClick={(e) => e.stopPropagation()}>
              <h2 id="consultar-pedidos-confirm-title" className="consultar-pedidos__confirm-title">
                Excluir todos os dados?
              </h2>
              <p className="consultar-pedidos__confirm-text">
                Os pedidos consultados e os dados com status serão removidos. Esta ação não pode ser desfeita.
              </p>
              <div className="consultar-pedidos__confirm-actions">
                <button
                  type="button"
                  className="consultar-pedidos__confirm-btn consultar-pedidos__confirm-btn--secondary"
                  onClick={() => setShowConfirmExcluir(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="consultar-pedidos__confirm-btn consultar-pedidos__confirm-btn--primary"
                  onClick={handleConfirmarExcluir}
                  disabled={deleting}
                >
                  {deleting ? 'A excluir…' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="consultar-pedidos consultar-pedidos--with-loader">
      <header className="consultar-pedidos__header">
        <div className="consultar-pedidos__header-top">
          <h1 className="consultar-pedidos__title">Importe tabela Consulta das bipagems em tempo real</h1>
          <button
            type="button"
            className="consultar-pedidos__btn-config consultar-pedidos__btn-config--header"
            onClick={() => setShowConfigModal(true)}
            title="Configuração (prefixos e envio automático para motorista)"
            aria-label="Abrir configuração"
          >
            <MdSettings className="consultar-pedidos__btn-config-icon" aria-hidden />
            <span className="consultar-pedidos__btn-config-label">Config</span>
          </button>
        </div>
        <p className="consultar-pedidos__desc">
          Consulte e pesquise pedidos. Importe uma planilha .xlsx para começar.
        </p>
      </header>
      <section className="consultar-pedidos__enviar">
        <label
          className={`consultar-pedidos__drop ${loading ? 'consultar-pedidos__drop--uploading' : ''}`}
          title="Clique ou arraste um arquivo .xlsx"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="consultar-pedidos__input"
            onChange={handleArquivo}
            disabled={loading}
          />
          <MdUpload className="consultar-pedidos__drop-icon" aria-hidden />
          <span className="consultar-pedidos__drop-text">
            Selecionar arquivo .xlsx
          </span>
        </label>
      </section>
        <ConsultarPedidosConfigModal
          open={showConfigModal}
          onClose={() => setShowConfigModal(false)}
        />
    </div>
  )
}
