import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MdOutlineDelete, MdUpload } from 'react-icons/md'
import { CiFilter } from 'react-icons/ci'
import DataTable from './DataTable'
import Loader from '../../../components/Loader'
import DateFilterSelect from '../../../components/DateFilterSelect'
import { useAppContext, useNotification } from '../../../context'
import { getPedidosDatas } from '../../../services'
import useVerificarPedidos from './hook/useVerificarPedidos'
import { transition, overlayVariants, modalContentVariants } from '../../../utils/animations'
import { CHUNK_SIZE } from './VerificarPedidosParados.js'
import './VerificarPedidosParados.css'

export default function VerificarPedidosParados() {
  const { user, setGlobalLoading } = useAppContext()
  const { showNotification } = useNotification()
  const [selectedDatas, setSelectedDatas] = useState([])
  const [columnFilters, setColumnFilters] = useState({})
  const [openFilterIndex, setOpenFilterIndex] = useState(null)
  const fetchPedidosDatas = useCallback(() => getPedidosDatas(user?.token), [user?.token])

  const isFilterDropdownOpen = openFilterIndex !== null

  const {
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
    bodyRows,
    totalRows,
    totalPages,
    currentPage,
    start,
    rowsPerPage,
    setRowsPerPage,
    goToPage,
    getAllNumerosJMS,
    loadingNumerosJMS,
    fullBodyRows,
    loadingFullData,
  } = useVerificarPedidos(user?.token, user?.config?.linhas_por_pagina, selectedDatas, columnFilters, isFilterDropdownOpen)

  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [numerosJMSCache, setNumerosJMSCache] = useState(null)
  const filterDropdownRef = useRef(null)
  const [filterDropdownAnchorRect, setFilterDropdownAnchorRect] = useState(null)
  const [filterSearchTerm, setFilterSearchTerm] = useState('')
  const [filterLoading, setFilterLoading] = useState(false)
  const filterLoadingTimeoutRef = useRef(null)
  const tableWrapRef = useRef(null)

  useEffect(() => {
    if (!filterDropdownOpen) return
    const onPointerDown = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setFilterDropdownOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [filterDropdownOpen])

  useEffect(() => {
    setNumerosJMSCache(null)
  }, [totalRows, columnFilters])

  useEffect(() => {
    if (!filterDropdownOpen || numerosJMSCache !== null || loadingNumerosJMS) return
    getAllNumerosJMS(columnFilters).then((arr) => setNumerosJMSCache(Array.isArray(arr) ? arr : []))
  }, [filterDropdownOpen, numerosJMSCache, loadingNumerosJMS, getAllNumerosJMS, columnFilters])

  /* Fechar dropdown de filtro por coluna ao clicar fora (tabela ou dropdown). */
  useEffect(() => {
    if (openFilterIndex === null) return
    function handleClickOutside(e) {
      if (tableWrapRef.current?.contains(e.target)) return
      if (e.target.closest('.verificar-pedidos__filter-dropdown')) return
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

  const toggleColumnFilterValue = useCallback((colIndex, value) => {
    const trimmed = String(value ?? '').trim()
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
    goToPage(1)
  }, [goToPage])

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
    setOpenFilterIndex(null)
    goToPage(1)
  }, [goToPage])

  const rowsForUniqueValues = Array.isArray(fullBodyRows) && fullBodyRows.length > 0 ? fullBodyRows : bodyRows
  const startForUniqueValues = Array.isArray(fullBodyRows) && fullBodyRows.length > 0 ? 0 : start

  const getUniqueColumnValues = useCallback(
    (colIndex) => {
      if (colIndex === 0) {
        return Array.from({ length: rowsForUniqueValues.length }, (_, i) => String(startForUniqueValues + i + 1))
      }
      const seen = new Set()
      rowsForUniqueValues.forEach((row) => {
        const v = row.values?.[colIndex - 1]
        const s = String(v ?? '').trim()
        if (s) seen.add(s)
      })
      return [...seen].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    },
    [rowsForUniqueValues, startForUniqueValues]
  )

  const activeFilterColIndices = useMemo(() => {
    const n = 1 + (headerValues?.length ?? 0)
    const indices = []
    for (let colIdx = 0; colIdx < n; colIdx++) {
      if ((Array.isArray(columnFilters[colIdx]) ? columnFilters[colIdx].length : 0) > 0) indices.push(colIdx)
    }
    return indices
  }, [columnFilters, headerValues])

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

  function toggleFilterValue(colIndex, value) {
    toggleColumnFilterValue(colIndex, value)
  }

  /* Sincroniza loadingLista e loading (upload) com o overlay global; ao mudar de página o layout limpa o overlay. */
  useEffect(() => {
    if (loadingLista) setGlobalLoading(true, 'Carregando…')
    else if (loading) setGlobalLoading(true, 'Enviando…')
    else setGlobalLoading(false)
  }, [loadingLista, loading, setGlobalLoading])

  const numerosChunks = (() => {
    if (!Array.isArray(numerosJMSCache) || numerosJMSCache.length === 0) return []
    const list = []
    for (let i = 0; i < numerosJMSCache.length; i += CHUNK_SIZE) {
      list.push(numerosJMSCache.slice(i, i + CHUNK_SIZE))
    }
    return list
  })()

  const handleCopyChunk = (chunk) => {
    const text = chunk.join('\n')
    navigator.clipboard.writeText(text).then(
      () => showNotification(`${chunk.length} número(s) copiado(s).`, 'success'),
      () => showNotification('Falha ao copiar.', 'error')
    )
  }

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    loading: false,
    onConfirm: null,
  })
  const [deletingRowId, setDeletingRowId] = useState(null)

  function openConfirmDeleteAll() {
    setConfirmModal({
      open: true,
      title: 'Apagar todos os dados?',
      message: 'Todos os registros de pedidos serão removidos. Esta ação não pode ser desfeita.',
      confirmLabel: 'Apagar tudo',
      cancelLabel: 'Cancelar',
      loading: false,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, loading: true }))
        try {
          await handleDeletar()
          setConfirmModal((p) => ({ ...p, open: false, loading: false }))
        } catch {
          setConfirmModal((p) => ({ ...p, loading: false }))
        }
      },
    })
  }

  async function handleDeletarLinhaConfirm(id) {
    setDeletingRowId(id)
    try {
      await handleDeletarLinha(id)
      setConfirmModal((p) => ({ ...p, open: false }))
    } finally {
      setDeletingRowId(null)
    }
  }

  function openConfirmDeleteRow(id) {
    setConfirmModal({
      open: true,
      title: 'Remover esta linha?',
      message: 'O registro será excluído permanentemente.',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      loading: false,
      onConfirm: () => handleDeletarLinhaConfirm(id),
    })
  }

  if (loadingLista) {
    return (
      <div className="verificar-pedidos verificar-pedidos--loader-wrap" aria-busy="true">
        <header className="verificar-pedidos__header">
          <h1 className="verificar-pedidos__title">Importe tabela de pedidos</h1>
          <p className="verificar-pedidos__desc">
            Aqui poderá verificar e tratar pedidos. Importe planilhas .xlsx (grandes volumes suportados).
          </p>
        </header>
        <section className="verificar-pedidos__enviar" aria-hidden>
          <label className="verificar-pedidos__drop" tabIndex={-1}>
            <span className="verificar-pedidos__drop-text">Selecionar arquivo .xlsx</span>
          </label>
        </section>
      </div>
    )
  }

  if (hasData) {
    return (
      <div className="verificar-pedidos verificar-pedidos--tabela">
        <div className="verificar-pedidos__toolbar">
          <div className="verificar-pedidos__search-wrap" style={{ maxWidth: '100%' }}>
            <DateFilterSelect
              token={user?.token}
              fetchDatas={fetchPedidosDatas}
              selectedDatas={selectedDatas}
              onChange={setSelectedDatas}
              label="Data do envio"
              disabled={deleting}
              className="verificar-pedidos__date-filter"
            />
          </div>
          <div className="verificar-pedidos__toolbar-actions" ref={filterDropdownRef}>
            <div className="verificar-pedidos__filter-wrap">
              <button
                type="button"
                className="verificar-pedidos__btn-filter"
                onClick={() => setFilterDropdownOpen((o) => !o)}
                disabled={deleting}
                title="Copiar números de pedido JMS (em lotes de 1000)"
                aria-label="Abrir menu copiar números JMS"
                aria-expanded={filterDropdownOpen}
                aria-haspopup="true"
              >
                <CiFilter className="verificar-pedidos__btn-filter-icon" />
              </button>
              {filterDropdownOpen && (
                <div className="verificar-pedidos__filter-dropdown" role="menu">
                  {loadingNumerosJMS ? (
                    <Loader text="A carregar…" size="sm" variant="row" />
                  ) : numerosChunks.length === 0 ? (
                    <p className="verificar-pedidos__filter-empty">
                      Coluna &quot;Número de pedido JMS&quot; não encontrada ou sem dados.
                    </p>
                  ) : (
                    numerosChunks.map((chunk, i) => (
                      <button
                        key={i}
                        type="button"
                        className="verificar-pedidos__filter-chunk-btn"
                        role="menuitem"
                        onClick={() => handleCopyChunk(chunk)}
                      >
                        <span className="verificar-pedidos__filter-chunk-label">
                          Lote {i + 1}
                        </span>
                        <span className="verificar-pedidos__filter-chunk-count">
                          {chunk.length} número{chunk.length !== 1 ? 's' : ''}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="verificar-pedidos__btn-delete"
              onClick={openConfirmDeleteAll}
              disabled={deleting}
              title="Apagar todos os dados"
              aria-label="Apagar todos os dados"
            >
              <MdOutlineDelete className="verificar-pedidos__btn-delete-icon" />
            </button>
          </div>
        </div>
        <div className="verificar-pedidos__table-wrap" ref={tableWrapRef}>
        <DataTable
          headerValues={headerValues}
          bodyRows={bodyRows}
          maxCols={maxCols}
          start={start}
          totalRows={totalRows}
          totalPages={totalPages}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={setRowsPerPage}
          onPageChange={goToPage}
          onDeleteRow={openConfirmDeleteRow}
          deletingRowId={deletingRowId}
          onHeaderClick={handleHeaderClick}
          activeFilterColIndices={activeFilterColIndices}
        />
        {openFilterIndex !== null && filterDropdownAnchorRect && (
          <div
            className="verificar-pedidos__filter-dropdown verificar-pedidos__filter-dropdown--menu verificar-pedidos__filter-dropdown--fixed"
            style={{
              position: 'fixed',
              top: filterDropdownAnchorRect.top + 2,
              left: filterDropdownAnchorRect.left,
              minWidth: Math.max(filterDropdownAnchorRect.width, 200),
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="verificar-pedidos__filter-dropdown-inner">
              {filterLoading || loadingFullData ? (
                <div className="verificar-pedidos__filter-loading" aria-busy="true">
                  <span className="verificar-pedidos__filter-spinner" aria-hidden />
                  <span className="verificar-pedidos__filter-loading-text">Carregando…</span>
                </div>
              ) : (
                <>
                  <div className="verificar-pedidos__filter-dropdown-search-wrap">
                    <input
                      type="text"
                      className="verificar-pedidos__filter-dropdown-search"
                      placeholder="Pesquisar..."
                      value={filterSearchTerm}
                      onChange={(e) => setFilterSearchTerm(e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="verificar-pedidos__filter-dropdown-list">
                    <div className="verificar-pedidos__filter-menu">
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
                              className={`verificar-pedidos__filter-menu-item ${checked ? 'verificar-pedidos__filter-menu-item--selected' : ''}`}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleFilterValue(openFilterIndex, optionValue)
                              }}
                            >
                              <span className="verificar-pedidos__filter-menu-icon" aria-hidden>
                                {checked ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                                )}
                              </span>
                              <span className="verificar-pedidos__filter-menu-text">{optionValue}</span>
                            </button>
                          )
                        })}
                    </div>
                  </div>
                  <div className="verificar-pedidos__filter-dropdown-footer">
                    <div className="verificar-pedidos__filter-menu-separator" />
                    <button
                      type="button"
                      className="verificar-pedidos__filter-menu-item verificar-pedidos__filter-menu-item--action"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        clearColumnFilter(openFilterIndex)
                      }}
                    >
                      <span className="verificar-pedidos__filter-menu-icon" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </span>
                      <span className="verificar-pedidos__filter-menu-text">Limpar filtro</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        </div>

        <AnimatePresence>
          {confirmModal.open && (
            <motion.div
              className="verificar-pedidos__confirm-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition}
              onClick={() => !confirmModal.loading && setConfirmModal((p) => ({ ...p, open: false }))}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-modal-title"
            >
              <motion.div
                className="verificar-pedidos__confirm-modal"
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={transition}
                onClick={(e) => e.stopPropagation()}
              >
              <h2 id="confirm-modal-title" className="verificar-pedidos__confirm-title">
                {confirmModal.title}
              </h2>
              <p className="verificar-pedidos__confirm-message">{confirmModal.message}</p>
              <div className="verificar-pedidos__confirm-actions">
                <button
                  type="button"
                  className="verificar-pedidos__confirm-btn verificar-pedidos__confirm-btn--cancel"
                  onClick={() => !confirmModal.loading && setConfirmModal((p) => ({ ...p, open: false }))}
                  disabled={confirmModal.loading}
                >
                  {confirmModal.cancelLabel}
                </button>
                <button
                  type="button"
                  className="verificar-pedidos__confirm-btn verificar-pedidos__confirm-btn--primary"
                  onClick={() => confirmModal.onConfirm?.()}
                  disabled={confirmModal.loading}
                >
                  {confirmModal.loading ? 'Aguarde…' : confirmModal.confirmLabel}
                </button>
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="verificar-pedidos">
      <header className="verificar-pedidos__header">
        <h1 className="verificar-pedidos__title">Importe tabela de pedidos</h1>
        <p className="verificar-pedidos__desc">
          Aqui poderá verificar e tratar pedidos. Importe planilhas .xlsx (grandes volumes suportados).
        </p>
      </header>
      <section className="verificar-pedidos__enviar verificar-pedidos__enviar-wrap">
        <label
          className={`verificar-pedidos__drop ${loading ? 'verificar-pedidos__drop--uploading' : ''}`}
          title="Clique ou arraste um arquivo .xlsx"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="verificar-pedidos__input"
            onChange={handleArquivo}
            disabled={loading}
          />
          <MdUpload className="verificar-pedidos__drop-icon" aria-hidden />
          <span className="verificar-pedidos__drop-text">
            Selecionar arquivo .xlsx
          </span>
        </label>
      </section>
    </div>
  )
}
