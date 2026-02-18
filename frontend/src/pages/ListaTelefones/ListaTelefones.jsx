import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MdOutlineDelete, MdOutlineDownload, MdLock, MdEdit, MdUpload } from 'react-icons/md'
import * as XLSX from 'xlsx'
import { useAppContext, useNotification } from '../../context'
import { updateListaTelefonesHub, getListaTelefonesDatas } from '../../services'
import useListaTelefones from './hook/useListaTelefones'
import DateFilterSelect from '../../components/DateFilterSelect'
import { transition, overlayVariants, modalContentVariants } from '../../utils/animations'
import './ListaTelefones.css'

export default function ListaTelefones() {
  const { user } = useAppContext()
  const [selectedDatas, setSelectedDatas] = useState([])
  const fetchListaDatas = useCallback(() => getListaTelefonesDatas(user?.token), [user?.token])
  const {
    hasData,
    loading,
    loadingLista,
    deleting,
    inputRef,
    handleArquivo,
    handleDeletar,
    handleDeletarLinha,
    searchTerm,
    setSearchTerm,
    rowsPerPage,
    setRowsPerPage,
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
  } = useListaTelefones(user?.token, user?.config?.linhas_por_pagina, selectedDatas)

  const { showNotification } = useNotification()
  const hubColumnIndex = headerValues.findIndex((h) => String(h).trim().toUpperCase() === 'HUB')
  const hubFilterSelected = hubColumnIndex >= 0 ? (columnFilters[hubColumnIndex] || []) : []
  const hubUnlocked = hubColumnIndex >= 0 && hubFilterSelected.length === 1
  const hubValorAtual = hubUnlocked ? hubFilterSelected[0] : ''

  const [openFilterIndex, setOpenFilterIndex] = useState(null)
  const [hubEditOpen, setHubEditOpen] = useState(false)
  const [hubEditValue, setHubEditValue] = useState('')
  const [hubUpdating, setHubUpdating] = useState(false)
  const [filterLoading, setFilterLoading] = useState(false)
  const [filterSearchTerm, setFilterSearchTerm] = useState('')
  const [deletingRowId, setDeletingRowId] = useState(null)
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    loading: false,
    onConfirm: null,
    payload: null,
    needPassword: false,
  })
  const [confirmSenha, setConfirmSenha] = useState('')
  const filterDropdownRef = useRef(null)
  const filterLoadingTimeoutRef = useRef(null)

  /* Fechar dropdown de filtro ao clicar fora (pill, área de filtros ou dropdown). */
  useEffect(() => {
    if (openFilterIndex === null) return
    function handleClickOutside(e) {
      if (e.target.closest('.lista-telefones__filter-pill')) return
      if (filterDropdownRef.current?.contains(e.target)) return
      if (e.target.closest('.lista-telefones__filter-dropdown')) return
      setOpenFilterIndex(null)
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [openFilterIndex])

  useEffect(() => {
    if (openFilterIndex === null) {
      if (filterLoadingTimeoutRef.current) {
        clearTimeout(filterLoadingTimeoutRef.current)
        filterLoadingTimeoutRef.current = null
      }
    }
  }, [openFilterIndex])

  function openFilter(colIndex) {
    if (openFilterIndex === colIndex && !filterLoading) {
      setOpenFilterIndex(null)
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
    }, 400)
  }

  function toggleFilterValue(colIndex, value) {
    toggleColumnFilterValue(colIndex, value)
  }

  function openHubEdit() {
    if (!hubUnlocked) return
    setHubEditValue('')
    setHubEditOpen(true)
  }

  function openConfirmDeleteAll() {
    setConfirmSenha('')
    setConfirmModal({
      open: true,
      title: 'Apagar todos os dados?',
      message: 'Todos os registros da lista serão removidos. Esta ação não pode ser desfeita. Digite sua senha para confirmar.',
      confirmLabel: 'Apagar tudo',
      cancelLabel: 'Cancelar',
      loading: false,
      payload: 'deleteAll',
      needPassword: true,
      onConfirm: async (senha) => {
        setConfirmModal((p) => ({ ...p, loading: true }))
        try {
          await handleDeletar(senha)
          setConfirmModal((p) => ({ ...p, open: false, loading: false }))
          setConfirmSenha('')
        } catch {
          setConfirmModal((p) => ({ ...p, loading: false }))
        }
      },
    })
  }

  function openConfirmDeleteRow(id) {
    setConfirmSenha('')
    setConfirmModal({
      open: true,
      title: 'Remover esta linha?',
      message: 'O registro será excluído permanentemente. Digite sua senha para confirmar.',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      loading: false,
      payload: id,
      needPassword: true,
      onConfirm: async (senha) => {
        setConfirmModal((p) => ({ ...p, loading: true }))
        try {
          await handleDeletarLinha(id, senha)
          setConfirmModal((p) => ({ ...p, open: false, loading: false }))
          setConfirmSenha('')
        } catch {
          setConfirmModal((p) => ({ ...p, loading: false }))
        }
      },
    })
  }

  async function submitHubEdit() {
    const novo = hubEditValue.trim()
    if (!novo) return
    const rawToReplace = getRawValuesThatTrimTo(hubColumnIndex, hubValorAtual)
    if (rawToReplace.length === 0) {
      showNotification('Nenhum valor encontrado para substituir.', 'error')
      return
    }
    setHubUpdating(true)
    try {
      const res = await updateListaTelefonesHub(user?.token, hubColumnIndex, rawToReplace, novo)
      showNotification(`${res.updated ?? 0} registro(s) atualizado(s).`, 'success')
      setHubEditOpen(false)
      refetchLista()
    } catch (err) {
      showNotification(err.message || 'Erro ao atualizar HUB.', 'error')
    } finally {
      setHubUpdating(false)
    }
  }

  function downloadTabela() {
    if (!headerValues.length || !filteredRows.length) return
    const rows = [
      headerValues,
      ...filteredRows.map((row) => (row.values || []).map((v) => (v == null ? '' : String(v)))),
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Lista')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lista-telefones-${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (hasData) {
    return (
      <div className="lista-telefones lista-telefones--tabela">
        <div className="lista-telefones__toolbar">
          <div className="lista-telefones__search-wrap">
            <DateFilterSelect
              token={user?.token}
              fetchDatas={fetchListaDatas}
              selectedDatas={selectedDatas}
              onChange={setSelectedDatas}
              label=""
              disabled={deleting}
              className="lista-telefones__date-filter"
            />
            <div className="lista-telefones__search-inner">
              <svg className="lista-telefones__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="lista-telefones__search"
                placeholder="Buscar na lista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                title="Buscar por texto em qualquer coluna"
              />
            </div>
          </div>
          <div className="lista-telefones__toolbar-actions">
            <button
              type="button"
              className="lista-telefones__btn-download"
              onClick={downloadTabela}
              disabled={filteredRows.length === 0}
              title="Baixar tabela (dados filtrados)"
              aria-label="Baixar tabela (dados filtrados)"
            >
              <MdOutlineDownload className="lista-telefones__btn-download-icon" />
            </button>
            <button
              type="button"
              className="lista-telefones__btn-delete"
              onClick={openConfirmDeleteAll}
              disabled={deleting}
              title="Apagar todos os dados da lista"
              aria-label="Apagar todos os dados da lista"
            >
              <MdOutlineDelete className="lista-telefones__btn-delete-icon" />
            </button>
          </div>
        </div>
        <div className="lista-telefones__filters" ref={filterDropdownRef}>
          {headerValues.map((val, i) => {
            const selected = Array.isArray(columnFilters[i]) ? columnFilters[i] : []
            const isActive = selected.length > 0
            const pillLabel = isActive
              ? selected.length === 1
                ? `${val}: ${selected[0]}`
                : `${val} (${selected.length})`
              : ''
            return (
              <div key={i} className="lista-telefones__filter-wrap">
                {isActive ? (
                  <span className="lista-telefones__filter-pill lista-telefones__filter-pill--active">
                    <span className="lista-telefones__filter-pill-label">{pillLabel}</span>
                    <button
                      type="button"
                      className="lista-telefones__filter-pill-remove"
                      onClick={() => clearColumnFilter(i)}
                      aria-label={`Remover filtro ${val}`}
                      title={`Remover filtro ${val}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </span>
                ) : (
                  <div className="lista-telefones__filter-pill lista-telefones__filter-pill--inactive" onClick={() => openFilter(i)}>
                    <button
                      type="button"
                      className="lista-telefones__filter-pill-btn"
                      
                      title={`Filtrar por ${val}`}
                    >
                      <span className="lista-telefones__filter-pill-label">{val}</span>
                      <svg className="lista-telefones__filter-pill-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                  </div>
                )}
                {openFilterIndex === i && (
                  <div
                    className="lista-telefones__filter-dropdown lista-telefones__filter-dropdown--menu"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="lista-telefones__filter-dropdown-inner">
                      {filterLoading ? (
                        <div className="lista-telefones__filter-loading" aria-busy="true">
                          <span className="lista-telefones__filter-spinner" aria-hidden />
                          <span className="lista-telefones__filter-loading-text">Carregando…</span>
                        </div>
                      ) : (
                        <>
                          <div className="lista-telefones__filter-dropdown-search-wrap">
                            <input
                              type="text"
                              className="lista-telefones__filter-dropdown-search"
                              placeholder="Pesquisar..."
                              value={filterSearchTerm}
                              onChange={(e) => setFilterSearchTerm(e.target.value)}
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="lista-telefones__filter-dropdown-list">
                            <div className="lista-telefones__filter-menu">
                              {getUniqueColumnValues(i)
                                .filter((optionValue) =>
                                  String(optionValue).toLowerCase().includes(filterSearchTerm.trim().toLowerCase())
                                )
                                .map((optionValue) => {
                                  const checked = isColumnFilterValueSelected(i, optionValue)
                                  return (
                                    <button
                                      key={optionValue}
                                      type="button"
                                      className={`lista-telefones__filter-menu-item ${checked ? 'lista-telefones__filter-menu-item--selected' : ''}`}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        toggleFilterValue(i, optionValue)
                                      }}
                                    >
                                      <span className="lista-telefones__filter-menu-icon" aria-hidden>
                                        {checked ? (
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                                        ) : (
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                                        )}
                                      </span>
                                      <span className="lista-telefones__filter-menu-text">{optionValue}</span>
                                    </button>
                                  )
                                })}
                            </div>
                          </div>
                          <div className="lista-telefones__filter-dropdown-footer">
                            <div className="lista-telefones__filter-menu-separator" />
                            <button
                              type="button"
                              className="lista-telefones__filter-menu-item lista-telefones__filter-menu-item--action"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                clearColumnFilter(i)
                                setOpenFilterIndex(null)
                              }}
                            >
                              <span className="lista-telefones__filter-menu-icon" aria-hidden>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                              </span>
                              <span className="lista-telefones__filter-menu-text">Limpar filtro</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="lista-telefones__wrap">
          <table className="lista-telefones__table">
            <thead>
              <tr>
                <th className="lista-telefones__th-id">ID</th>
                {headerValues.map((val, i) => {
                  const isHub = i === hubColumnIndex
                  if (isHub) {
                    return (
                      <th key={i} className="lista-telefones__th-hub">
                        {hubUnlocked ? (
                          <button
                            type="button"
                            className="lista-telefones__th-hub-btn"
                            onClick={openHubEdit}
                            title="Substituir valor filtrado por novo nome da base"
                            aria-label="Editar HUB: substituir valor filtrado"
                          >
                            <span className="lista-telefones__th-hub-label">{val}</span>
                            <MdEdit className="lista-telefones__th-hub-icon" aria-hidden />
                          </button>
                        ) : (
                          <span className="lista-telefones__th-hub-locked" title="Filtre esta coluna por um único valor para desbloquear">
                            <MdLock className="lista-telefones__th-hub-lock" aria-hidden />
                            <span>{val}</span>
                          </span>
                        )}
                      </th>
                    )
                  }
                  return <th key={i}>{val}</th>
                })}
                {Array.from({ length: maxCols - headerValues.length }, (_, i) => (
                  <th key={`e-${i}`} />
                ))}
                <th className="lista-telefones__th-actions" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((item, rowIndex) => (
                <tr key={item._id}>
                  <td className="lista-telefones__td-id">{String(start + rowIndex + 1).padStart(3, '0')}</td>
                  {(item.values || []).map((val, i) => (
                    <td key={i}>{val}</td>
                  ))}
                  {Array.from({ length: maxCols - (item.values || []).length }, (_, i) => (
                    <td key={`e-${i}`} />
                  ))}
                  <td className="lista-telefones__td-actions">
                    <button
                      type="button"
                      className="lista-telefones__btn-row-delete"
                      onClick={() => openConfirmDeleteRow(item._id)}
                      disabled={deletingRowId === item._id}
                      title="Remover esta linha"
                      aria-label="Remover esta linha"
                    >
                      <MdOutlineDelete className="lista-telefones__btn-row-delete-icon" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="lista-telefones__pagination">
          <div className="lista-telefones__pagination-rows">
            <span className="lista-telefones__pagination-label">Linhas por página</span>
            <select
              className="lista-telefones__pagination-select"
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              title="Alterar quantidade de linhas exibidas por página"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="lista-telefones__pagination-nav">
            <span className="lista-telefones__pagination-range">
              {totalRows === 0 ? '0' : `${start + 1}-${Math.min(start + rowsPerPage, totalRows)}`} de {totalRows}
            </span>
            <div className="lista-telefones__pagination-buttons">
              <button
                type="button"
                className="lista-telefones__pagination-btn"
                onClick={() => goToPage(1)}
                disabled={currentPage <= 1}
                aria-label="Primeira página"
                title="Primeira página"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 18V6h-2v12h2zM6 12l6-6v12L6 12z" /></svg>
              </button>
              <button
                type="button"
                className="lista-telefones__pagination-btn"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Página anterior"
                title="Página anterior"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button
                type="button"
                className="lista-telefones__pagination-btn"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Próxima página"
                title="Próxima página"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </button>
              <button
                type="button"
                className="lista-telefones__pagination-btn"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage >= totalPages}
                aria-label="Última página"
                title="Última página"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6v12h2V6H6zm12 0l-6 6v12l6-6V6z" /></svg>
              </button>
            </div>
          </div>
        </footer>

        {hubEditOpen && (
          <div className="lista-telefones__hub-modal-overlay" onClick={() => !hubUpdating && setHubEditOpen(false)} role="dialog" aria-modal="true" aria-labelledby="hub-modal-title">
            <div className="lista-telefones__hub-modal" onClick={(e) => e.stopPropagation()}>
              <div className="lista-telefones__hub-modal-header">
                <span className="lista-telefones__hub-modal-icon" aria-hidden>
                  <MdEdit />
                </span>
                <h2 id="hub-modal-title" className="lista-telefones__hub-modal-title">Substituir nome da base</h2>
              </div>
              <p className="lista-telefones__hub-modal-desc">
                Todos os registros com <strong>&quot;{hubValorAtual}&quot;</strong> serão alterados para o novo nome.
              </p>
              <label className="lista-telefones__hub-modal-label">
                Novo nome da base
              </label>
              <input
                type="text"
                className="lista-telefones__hub-modal-input"
                value={hubEditValue}
                onChange={(e) => setHubEditValue(e.target.value)}
                placeholder="Ex.: SC BNU"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitHubEdit()
                  if (e.key === 'Escape') setHubEditOpen(false)
                }}
              />
              <div className="lista-telefones__hub-modal-actions">
                <button
                  type="button"
                  className="lista-telefones__hub-modal-btn lista-telefones__hub-modal-btn--secondary"
                  onClick={() => setHubEditOpen(false)}
                  disabled={hubUpdating}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="lista-telefones__hub-modal-btn lista-telefones__hub-modal-btn--primary"
                  onClick={submitHubEdit}
                  disabled={hubUpdating || !hubEditValue.trim()}
                >
                  {hubUpdating ? 'Salvando…' : 'Substituir'}
                </button>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {confirmModal.open && (
            <motion.div
              className="lista-telefones__confirm-overlay"
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
                className="lista-telefones__confirm-modal"
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={transition}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="confirm-modal-title" className="lista-telefones__confirm-title">{confirmModal.title}</h2>
                <p className="lista-telefones__confirm-message">{confirmModal.message}</p>
                {confirmModal.needPassword && (
                  <label className="lista-telefones__hub-modal-label" style={{ marginTop: '1rem', marginBottom: '0.375rem' }}>
                    Sua senha
                  </label>
                )}
                {confirmModal.needPassword && (
                  <input
                    type="password"
                    className="lista-telefones__hub-modal-input"
                    value={confirmSenha}
                    onChange={(e) => setConfirmSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    style={{ marginBottom: '1rem' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && confirmSenha.trim()) confirmModal.onConfirm?.(confirmSenha)
                      if (e.key === 'Escape') setConfirmModal((p) => ({ ...p, open: false }))
                    }}
                  />
                )}
                <div className="lista-telefones__confirm-actions">
                  <button
                    type="button"
                    className="lista-telefones__confirm-btn lista-telefones__confirm-btn--cancel"
                    onClick={() => !confirmModal.loading && setConfirmModal((p) => ({ ...p, open: false }))}
                    disabled={confirmModal.loading}
                  >
                    {confirmModal.cancelLabel}
                  </button>
                  <button
                    type="button"
                    className="lista-telefones__confirm-btn lista-telefones__confirm-btn--primary"
                    onClick={() => confirmModal.onConfirm?.(confirmSenha)}
                    disabled={confirmModal.loading || (confirmModal.needPassword && !confirmSenha.trim())}
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
    <div className="lista-telefones">
      <header className="lista-telefones__header">
        <h1 className="lista-telefones__title">Lista de telefones</h1>
        <p className="lista-telefones__desc">Importe planilhas .xlsx e visualize os dados salvos.</p>
      </header>
      <section className="lista-telefones__enviar">
        {loadingLista ? (
          <p className="lista-telefones__loading">Carregando…</p>
        ) : (
          <label className={`lista-telefones__drop ${loading ? 'lista-telefones__drop--uploading' : ''}`} title="Clique ou arraste um arquivo .xlsx">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="lista-telefones__input"
              onChange={handleArquivo}
              disabled={loading}
            />
            <MdUpload className="lista-telefones__drop-icon" aria-hidden />
            <span className="lista-telefones__drop-text">
              {loading ? 'Enviando…' : 'Selecionar arquivo .xlsx'}
            </span>
          </label>
        )}
      </section>
    </div>
  )
}
