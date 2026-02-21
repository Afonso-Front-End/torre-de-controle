import { useState, useEffect, useRef } from 'react'
import { MdOutlineDelete, MdSort, MdSettings, MdAssessment, MdUpdate, MdUpload, MdAttachFile } from 'react-icons/md'
import DateFilterSelect from '../../../../components/DateFilterSelect'
import { SORT_OPTIONS } from '../../SLA.js'

export default function SLAToolbar({
  token,
  fetchSLADatas,
  selectedDatas,
  setSelectedDatas,
  selectedPeriodo,
  setSelectedPeriodo,
  sortBy,
  sortDir,
  setSort,
  setSortDropdownOpen,
  sortDropdownOpen,
  sortDropdownRef,
  totalMotoristas,
  setPage,
  indicadoresLoading,
  hasData,
  deleting,
  onDadosClick,
  atualizarSLAInputRef,
  onAtualizarSLAChange,
  atualizandoSLA,
  slaDatasDisponiveis,
  dataParaAtualizarSLA,
  setDataParaAtualizarSLA,
  atualizarDropdownOpen,
  setAtualizarDropdownOpen,
  entradaGalpaoInputRef,
  onEntradaGalpaoClick,
  onEntradaGalpaoChange,
  atualizandoEntradaGalpao,
  onConfigClick,
  onDeletar,
}) {
  const atualizarDropdownRef = useRef(null)

  useEffect(() => {
    if (!atualizarDropdownOpen) return
    function handleClickOutside(e) {
      if (atualizarDropdownRef.current?.contains(e.target)) return
      setAtualizarDropdownOpen(false)
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [atualizarDropdownOpen, setAtualizarDropdownOpen])
  return (
    <div className="sla__toolbar">
      <div className="sla__search-wrap">
        <DateFilterSelect
          token={token}
          fetchDatas={fetchSLADatas}
          selectedDatas={selectedDatas}
          onChange={setSelectedDatas}
          label=""
          disabled={deleting}
          className="sla__date-filter"
        />
        <div className="sla__periodo-segmented" role="group" aria-label="Período (Horário de saída para entrega)">
          <button
            type="button"
            className={`sla__periodo-btn sla__periodo-btn--first ${selectedPeriodo === 'AM' ? 'sla__periodo-btn--active' : ''}`}
            onClick={() => setSelectedPeriodo('AM')}
            disabled={indicadoresLoading}
            aria-pressed={selectedPeriodo === 'AM'}
          >
            AM
          </button>
          <button
            type="button"
            className={`sla__periodo-btn sla__periodo-btn--mid ${selectedPeriodo === 'PM' ? 'sla__periodo-btn--active' : ''}`}
            onClick={() => setSelectedPeriodo('PM')}
            disabled={indicadoresLoading}
            aria-pressed={selectedPeriodo === 'PM'}
          >
            PM
          </button>
          <button
            type="button"
            className={`sla__periodo-btn sla__periodo-btn--last ${selectedPeriodo === 'Todos' ? 'sla__periodo-btn--active' : ''}`}
            onClick={() => setSelectedPeriodo('Todos')}
            disabled={indicadoresLoading}
            aria-pressed={selectedPeriodo === 'Todos'}
          >
            Todos
          </button>
        </div>
      </div>

      <div className="sla__toolbar-actions" ref={sortDropdownRef}>
        <div className="sla__toolbar-sort-wrap">
          <button
            type="button"
            className={`sla__btn-sort ${sortDropdownOpen ? 'sla__btn-sort--open' : ''}`}
            onClick={() => setSortDropdownOpen((o) => !o)}
            disabled={indicadoresLoading || totalMotoristas === 0}
            title="Ordenar"
            aria-label="Ordenar"
            aria-expanded={sortDropdownOpen}
          >
            <MdSort className="sla__btn-sort-icon" aria-hidden />
          </button>
          {sortDropdownOpen && (
            <div className="sla__sort-dropdown" onMouseDown={(e) => e.stopPropagation()}>
              <div className="sla__sort-dropdown-inner">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={`${opt.sortBy}-${opt.sortDir}`}
                    type="button"
                    className={`sla__sort-option ${sortBy === opt.sortBy && sortDir === opt.sortDir ? 'sla__sort-option--active' : ''}`}
                    onClick={() => {
                      setSort({ sortBy: opt.sortBy, sortDir: opt.sortDir })
                      setSortDropdownOpen(false)
                      setPage(1)
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className="sla__btn-dados"
          onClick={onDadosClick}
          disabled={indicadoresLoading || !hasData}
          title="Ver dados SLA – resumo completo"
          aria-label="Ver dados SLA – resumo completo"
        >
          <MdAssessment className="sla__btn-dados-icon" aria-hidden />
        </button>
        <div className="sla__atualizar-wrap" ref={atualizarDropdownRef}>
          <input
            ref={atualizarSLAInputRef}
            type="file"
            accept=".xlsx"
            className="sla__atualizar-input"
            onChange={onAtualizarSLAChange}
            disabled={atualizandoSLA || indicadoresLoading}
            aria-hidden
          />
          <button
            type="button"
            className={`sla__btn-atualizar ${atualizarDropdownOpen ? 'sla__btn-atualizar--open' : ''}`}
            onClick={() => {
              setSortDropdownOpen(false)
              setAtualizarDropdownOpen((o) => !o)
            }}
            disabled={atualizandoSLA || indicadoresLoading || !hasData}
            title="Atualizar tabela SLA com Excel (escolher data e ficheiro)"
            aria-label="Atualizar tabela SLA com Excel"
            aria-expanded={atualizarDropdownOpen}
          >
            <MdUpdate className="sla__btn-atualizar-icon" aria-hidden />
          </button>
          {atualizarDropdownOpen && (
            <div className="sla__atualizar-dropdown" onMouseDown={(e) => e.stopPropagation()}>
              <label className="sla__atualizar-dropdown-label">Data da tabela a atualizar</label>
              <select
                className="sla__select-data-atualizar"
                value={dataParaAtualizarSLA || (slaDatasDisponiveis?.[0] ?? '')}
                onChange={(e) => setDataParaAtualizarSLA(e.target.value)}
                disabled={atualizandoSLA || indicadoresLoading}
                aria-label="Data da tabela a atualizar"
              >
                {Array.isArray(slaDatasDisponiveis) && slaDatasDisponiveis.length > 0 ? (
                  slaDatasDisponiveis.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))
                ) : (
                  <option value="">Sem datas</option>
                )}
              </select>
              <button
                type="button"
                className="sla__btn-adicionar-ficheiro"
                onClick={() => atualizarSLAInputRef.current?.click()}
                disabled={atualizandoSLA || indicadoresLoading || !dataParaAtualizarSLA}
                title="Escolher ficheiro Excel"
                aria-label="Adicionar ficheiro Excel"
              >
                <MdAttachFile className="sla__btn-adicionar-ficheiro-icon" aria-hidden />
                Adicionar ficheiro
              </button>
            </div>
          )}
        </div>
        <input
          ref={entradaGalpaoInputRef}
          type="file"
          accept=".xlsx"
          className="sla__atualizar-input"
          onChange={onEntradaGalpaoChange}
          aria-hidden
        />
        <button
          type="button"
          className="sla__btn-atualizar"
          onClick={onEntradaGalpaoClick}
          disabled={atualizandoEntradaGalpao || indicadoresLoading || !hasData}
          title="Importar arquivo Excel de entrada no galpão"
          aria-label="Importar arquivo Excel de entrada no galpão"
        >
          <MdUpload className="sla__btn-atualizar-icon" aria-hidden />
        </button>
        <button
          type="button"
          className="sla__btn-config"
          onClick={onConfigClick}
          disabled={indicadoresLoading || !hasData}
          title="Configurar bases de entrega"
          aria-label="Configurar bases de entrega"
        >
          <MdSettings className="sla__btn-config-icon" aria-hidden />
        </button>
        <button
          type="button"
          className="sla__btn-delete"
          onClick={onDeletar}
          disabled={deleting}
          title="Apagar todos os dados"
          aria-label="Apagar todos os dados"
        >
          <MdOutlineDelete className="sla__btn-delete-icon" />
        </button>
      </div>
    </div>
  )
}
