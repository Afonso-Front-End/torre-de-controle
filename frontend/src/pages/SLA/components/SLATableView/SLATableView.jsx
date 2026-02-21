import { MdEdit, MdTune } from 'react-icons/md'
import DataTable from '../../../VerificarPedidosParados/VerificarPedidos/DataTable'
import SLAPercentCell from '../SLAPercentCell'
import SLAColumnFilterDropdown from '../SLAColumnFilterDropdown'

export default function SLATableView({
  tableWrapRef,
  indicadoresLoading,
  slaTableHeader,
  bodyRowsPaginated,
  start,
  totalMotoristas,
  totalPages,
  currentPage,
  rowsPerPage,
  rowsPerPageOptions,
  onRowsPerPageChange,
  goToPage,
  onHeaderClick,
  activeFilterColIndices,
  pctColIndex,
  tipoAcompanhamento,
  onAcompanhamentoClick,
  cidadesFilterBtnRef,
  cidadesFilterOpen,
  onCidadesFilterClick,
  hasData,
  openFilterIndex,
  filterDropdownAnchorRect,
  filterSearchTerm,
  setFilterSearchTerm,
  getUniqueColumnValues,
  isColumnFilterValueSelected,
  toggleColumnFilterValue,
  clearColumnFilter,
  onCellEntreguesClick,
  onCellNaoEntreguesClick,
  onCellEntradaGalpaoClick,
}) {
  const optionsForColumn =
    openFilterIndex != null
      ? getUniqueColumnValues(openFilterIndex).filter((optionValue) =>
          String(optionValue).toLowerCase().includes(filterSearchTerm.trim().toLowerCase())
        )
      : []

  return (
    <div className="sla__table-wrap sla__table-wrap--resultados" ref={tableWrapRef}>
      {indicadoresLoading ? (
        <p className="sla__loading-text">A carregar indicadores…</p>
      ) : (
        <div className="sla__layout-tabela">
          <div className="sla__data-table sla__data-table--full">
            <DataTable
              headerValues={slaTableHeader}
              bodyRows={bodyRowsPaginated}
              maxCols={slaTableHeader.length}
              start={start}
              totalRows={totalMotoristas}
              totalPages={totalPages}
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={rowsPerPageOptions}
              onRowsPerPageChange={onRowsPerPageChange}
              onPageChange={goToPage}
              onHeaderClick={onHeaderClick}
              activeFilterColIndices={activeFilterColIndices}
              renderHeaderCell={(colIndex, label) =>
                colIndex === pctColIndex ? (
                  <span className="sla__th-pct-wrap">
                    <span>{label}</span>
                    <button
                      type="button"
                      className="sla__th-pct-edit"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAcompanhamentoClick()
                      }}
                      aria-label="Escolher tipo de acompanhamento"
                      title="Escolher tipo de acompanhamento"
                    >
                      <MdEdit size={18} />
                    </button>
                  </span>
                ) : colIndex === 1 ? (
                  <span className="sla__th-base-wrap">
                    <span>{label}</span>
                    <button
                      ref={cidadesFilterBtnRef}
                      type="button"
                      className={`sla__btn-cidades-filter ${cidadesFilterOpen ? 'sla__btn-cidades-filter--open' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onCidadesFilterClick()
                      }}
                      disabled={indicadoresLoading || !hasData}
                      title="Filtrar por Cidade Destino"
                      aria-label="Filtrar por Cidade Destino"
                      aria-expanded={cidadesFilterOpen}
                    >
                      <MdTune className="sla__btn-cidades-filter-icon" aria-hidden />
                    </button>
                  </span>
                ) : (
                  label
                )
              }
              renderCell={(colIndex, value, row) => {
                if (colIndex === pctColIndex) {
                  return <SLAPercentCell value={value} type={tipoAcompanhamento} />
                }
                if (colIndex === 0) {
                  const cidades = row?.cidades || []
                  return (
                    <div className="sla__cell-motorista">
                      <span className="sla__cell-motorista-nome">{value}</span>
                      {cidades.length > 0 && (
                        <span className="sla__cell-motorista-cidades">{cidades.join(', ')}</span>
                      )}
                    </div>
                  )
                }
                if (colIndex === 2) {
                  const num = Number(value) || 0
                  const motoristaNome = row?.values?.[0] ?? ''
                  const baseNome = row?.values?.[1] ?? '(sem base)'
                  if (num <= 0) return value
                  return (
                    <button
                      type="button"
                      className="sla__cell-entregues-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCellEntreguesClick(motoristaNome, baseNome)
                      }}
                      title={`Ver ${num} pedido(s) entregue(s)`}
                      aria-label={`Ver ${num} pedidos entregues de ${motoristaNome}`}
                    >
                      {value}
                    </button>
                  )
                }
                if (colIndex === 3) {
                  const num = Number(value) || 0
                  const motoristaNome = row?.values?.[0] ?? ''
                  const baseNome = row?.values?.[1] ?? '(sem base)'
                  if (num <= 0) return value
                  return (
                    <button
                      type="button"
                      className="sla__cell-nao-entregues-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCellNaoEntreguesClick(motoristaNome, baseNome)
                      }}
                      title={`Ver ${num} pedido(s) não entregue(s)`}
                      aria-label={`Ver ${num} pedidos não entregues de ${motoristaNome}`}
                    >
                      {value}
                    </button>
                  )
                }
                if (colIndex === 6) {
                  const num = Number(value) || 0
                  const motoristaNome = row?.values?.[0] ?? ''
                  const baseNome = row?.values?.[1] ?? '(sem base)'
                  if (num <= 0) return value
                  return (
                    <button
                      type="button"
                      className="sla__cell-entrada-galpao-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCellEntradaGalpaoClick(motoristaNome, baseNome)
                      }}
                      title={`Ver ${num} pedido(s) entrada no galpão`}
                      aria-label={`Ver ${num} pedidos entrada no galpão de ${motoristaNome}`}
                    >
                      {value}
                    </button>
                  )
                }
                return value
              }}
            />
            {openFilterIndex !== null && filterDropdownAnchorRect && (
              <SLAColumnFilterDropdown
                anchorRect={filterDropdownAnchorRect}
                searchTerm={filterSearchTerm}
                onSearchChange={setFilterSearchTerm}
                options={optionsForColumn}
                isSelected={(optionValue) => isColumnFilterValueSelected(openFilterIndex, optionValue)}
                onToggle={(optionValue) => toggleColumnFilterValue(openFilterIndex, optionValue)}
                onClear={() => clearColumnFilter(openFilterIndex)}
                onMouseDownCapture={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
