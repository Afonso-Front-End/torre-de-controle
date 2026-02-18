import { useRef, useEffect } from 'react'
import { MdOutlineDelete } from 'react-icons/md'
import './DataTable.css'

/**
 * Tabela com coluna ID, colunas dinâmicas e paginação (uso na página Verificar pedidos).
 * Opcional: coluna de seleção (checkbox) à esquerda do ID.
 *
 * @param {string[]} headerValues - Títulos das colunas (exceto ID e Ações)
 * @param {{ _id: string, values: string[] }[]} bodyRows - Linhas (cada uma com _id e values)
 * @param {number} maxCols - Número máximo de colunas de dados (para células vazias)
 * @param {number} start - Índice inicial para exibir o ID da linha (ex.: paginação)
 * @param {number} totalRows - Total de registros
 * @param {number} totalPages - Total de páginas
 * @param {number} currentPage - Página atual
 * @param {number} rowsPerPage - Linhas por página
 * @param {number[]} [rowsPerPageOptions] - Opções do select "linhas por página"
 * @param {(n: number) => void} onRowsPerPageChange - Callback ao mudar linhas por página
 * @param {(page: number) => void} onPageChange - Callback ao mudar página
 * @param {(id: string) => void} [onDeleteRow] - Se definido, mostra botão apagar por linha
 * @param {string | null} [deletingRowId] - ID da linha cujo delete está em progresso
 * @param {boolean} [showSelectionColumn] - Se true, mostra coluna de checkbox à esquerda do ID
 * @param {Set<string>|string[]} [selectedRowIds] - IDs das linhas selecionadas
 * @param {(id: string, checked: boolean) => void} [onSelectionChange] - Callback ao marcar/desmarcar linha
 * @param {(checked: boolean) => void} [onSelectAllChange] - Callback ao marcar/desmarcar "selecionar todos"
 * @param {boolean} [selectAllChecked] - "Selecionar todos" marcado (todos os filtrados)
 * @param {boolean} [selectAllIndeterminate] - "Selecionar todos" indeterminado (alguns selecionados)
 * @param {(filterColIndex: number, event: React.MouseEvent) => void} [onHeaderClick] - Se definido, clicar no th (ID ou coluna) abre filtro; filterColIndex 0 = ID, 1+ = colunas de dados
 * @param {Set<number> | number[]} [activeFilterColIndices] - Índices das colunas com filtro ativo (0 = ID, 1+ = dados) para destacar o th
 * @param {(row: { _id: string, values: any[] }, rowIndex: number) => void} [onRowClick] - Se definido, clicar na linha chama este callback
 * @param {string | null} [selectedRowId] - ID da linha a destacar como selecionada (ex.: linha do modal aberto)
 * @param {number} [clickableColIndex] - Se definido com onRowClick, só a célula desta coluna de dados (0 = primeira) abre o modal; a linha inteira não é clicável
 * @param {(row: { _id: string, values: any[] }, rowIndex: number, colIndex: number) => void} [onCellClick] - Se definido com clickableColIndices, clicar na célula chama este callback
 * @param {number[]} [clickableColIndices] - Índices das colunas de dados (0, 1, 2...) cujas células são clicáveis e chamam onCellClick
 * @param {(columnIndex: number, headerLabel: string) => React.ReactNode} [renderHeaderCell] - Conteúdo custom do th; se não definido usa headerLabel
 * @param {(columnIndex: number, value: string, row: object) => React.ReactNode} [renderCell] - Conteúdo custom do td; se não definido usa value
 */
export default function DataTable({
  headerValues = [],
  bodyRows = [],
  maxCols = 0,
  start = 0,
  totalRows = 0,
  totalPages = 0,
  currentPage = 1,
  rowsPerPage = 25,
  rowsPerPageOptions = [10, 25, 50, 100, 200],
  onRowsPerPageChange,
  onPageChange,
  onDeleteRow,
  deletingRowId = null,
  showSelectionColumn = false,
  selectedRowIds = [],
  onSelectionChange,
  onSelectAllChange,
  selectAllChecked = false,
  selectAllIndeterminate = false,
  onHeaderClick,
  activeFilterColIndices,
  onRowClick,
  selectedRowId = null,
  clickableColIndex = null,
  onCellClick,
  clickableColIndices = [],
  renderHeaderCell,
  renderCell,
}) {
  const showActions = typeof onDeleteRow === 'function'
  const activeFilterSet = activeFilterColIndices != null
    ? (activeFilterColIndices instanceof Set ? activeFilterColIndices : new Set(activeFilterColIndices))
    : new Set()
  const selectedSet = showSelectionColumn && selectedRowIds
    ? (selectedRowIds instanceof Set ? selectedRowIds : new Set(selectedRowIds))
    : new Set()
  const selectAllRef = useRef(null)

  useEffect(() => {
    const el = selectAllRef.current
    if (el) el.indeterminate = !!selectAllIndeterminate
  }, [selectAllIndeterminate])

  return (
    <div className="data-table">
      <div className="data-table__wrap">
        <table className={`data-table__table${showSelectionColumn ? ' data-table__table--has-select' : ''}`}>
          <thead>
            <tr>
              {showSelectionColumn && (
                <th className="data-table__th-select" scope="col" aria-label="Selecionar">
                  <label className="data-table__select-all-wrap">
                    <input
                      type="checkbox"
                      className="data-table__select-all"
                      ref={selectAllRef}
                      checked={selectAllChecked}
                      onChange={(e) => onSelectAllChange?.(e.target.checked)}
                      aria-label="Selecionar todos os itens filtrados"
                      title="Selecionar todos (inclui linhas fora da página atual)"
                    />
                  </label>
                </th>
              )}
              <th
                className={`data-table__th-id${onHeaderClick ? ' data-table__th--filterable' : ''}${activeFilterSet.has(0) ? ' data-table__th--filter-active' : ''}`}
                onClick={onHeaderClick ? (e) => onHeaderClick(0, e) : undefined}
                onKeyDown={onHeaderClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHeaderClick(0, e) } } : undefined}
                role={onHeaderClick ? 'button' : undefined}
                tabIndex={onHeaderClick ? 0 : undefined}
                title={onHeaderClick ? 'Abrir filtro' : undefined}
              >
                ID
              </th>
              {headerValues.map((val, i) => (
                <th
                  key={i}
                  className={`${onHeaderClick ? 'data-table__th--filterable' : ''}${activeFilterSet.has(1 + i) ? ' data-table__th--filter-active' : ''}`.trim() || undefined}
                  onClick={onHeaderClick ? (e) => onHeaderClick(1 + i, e) : undefined}
                  onKeyDown={onHeaderClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHeaderClick(1 + i, e) } } : undefined}
                  role={onHeaderClick ? 'button' : undefined}
                  tabIndex={onHeaderClick ? 0 : undefined}
                  title={onHeaderClick ? 'Abrir filtro' : undefined}
                >
                  {typeof renderHeaderCell === 'function' ? renderHeaderCell(i, val) : val}
                </th>
              ))}
              {Array.from({ length: Math.max(0, maxCols - headerValues.length) }, (_, i) => (
                <th key={`e-${i}`} />
              ))}
              {showActions && (
                <th className="data-table__th-actions" aria-label="Ações" />
              )}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((item, rowIndex) => {
              const useCellClick = typeof onCellClick === 'function' && Array.isArray(clickableColIndices) && clickableColIndices.length > 0
              const useRowClick = onRowClick && !useCellClick && clickableColIndex == null
              const useSingleColClick = onRowClick && !useCellClick && clickableColIndex != null
              const handleRowAction = () => onRowClick(item, start + rowIndex)
              const rowClickable = useRowClick
              return (
              <tr
                key={item._id}
                onClick={rowClickable ? handleRowAction : undefined}
                role={rowClickable ? 'button' : undefined}
                tabIndex={rowClickable ? 0 : undefined}
                onKeyDown={rowClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowAction() } } : undefined}
                className={[
                  rowClickable ? 'data-table__tr--clickable' : null,
                  selectedRowId != null && item._id === selectedRowId ? 'data-table__tr--selected' : null,
                ].filter(Boolean).join(' ') || undefined}
              >
                {showSelectionColumn && (
                  <td className="data-table__td-select">
                    <label className="data-table__row-select-wrap">
                      <input
                        type="checkbox"
                        className="data-table__row-select"
                        checked={selectedSet.has(item._id)}
                        onChange={(e) => onSelectionChange?.(item._id, e.target.checked)}
                        aria-label={`Selecionar linha ${start + rowIndex + 1}`}
                      />
                    </label>
                  </td>
                )}
                <td className="data-table__td-id">
                  {String(start + rowIndex + 1).padStart(3, '0')}
                </td>
                {(item.values || []).map((val, i) => {
                  const isCellClickCol = useCellClick && clickableColIndices.indexOf(i) !== -1
                  const isSingleColClick = useSingleColClick && clickableColIndex === i
                  const isClickableCell = isCellClickCol || isSingleColClick
                  const handleCellAction = () => {
                    if (isCellClickCol) onCellClick(item, start + rowIndex, i)
                    else if (isSingleColClick) handleRowAction()
                  }
                  const cellTitle = isCellClickCol
                    ? (i === 0 ? 'Ver pedidos do entregador' : 'Ver evolução do motorista')
                    : isSingleColClick
                      ? 'Ver pedidos do entregador'
                      : undefined
                  return (
                    <td
                      key={i}
                      className={isClickableCell ? 'data-table__td--clickable' : undefined}
                      onClick={isClickableCell ? (e) => { e.stopPropagation(); handleCellAction() } : undefined}
                      role={isClickableCell ? 'button' : undefined}
                      tabIndex={isClickableCell ? 0 : undefined}
                      onKeyDown={isClickableCell ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCellAction() } } : undefined}
                      title={cellTitle}
                    >
                      {typeof renderCell === 'function' ? renderCell(i, val, item) : val}
                    </td>
                  )
                })}
                {Array.from({ length: maxCols - (item.values || []).length }, (_, i) => (
                  <td key={`e-${i}`} />
                ))}
                {showActions && (
                  <td className="data-table__td-actions">
                    <button
                      type="button"
                      className="data-table__btn-row-delete"
                      onClick={() => onDeleteRow(item._id)}
                      disabled={deletingRowId === item._id}
                      title="Remover esta linha"
                      aria-label="Remover esta linha"
                    >
                      <MdOutlineDelete className="data-table__btn-row-delete-icon" aria-hidden />
                    </button>
                  </td>
                )}
              </tr>
            )
            })}
          </tbody>
        </table>
      </div>
      <footer className="data-table__pagination">
        <div className="data-table__pagination-rows">
          <span className="data-table__pagination-label">Linhas por página</span>
          <select
            className="data-table__pagination-select"
            value={rowsPerPage}
            onChange={(e) => {
              onRowsPerPageChange?.(Number(e.target.value))
              onPageChange?.(1)
            }}
            title="Alterar quantidade de linhas exibidas por página"
          >
            {rowsPerPageOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="data-table__pagination-nav">
          <span className="data-table__pagination-range">
            {totalRows === 0 ? '0' : `${start + 1}-${Math.min(start + bodyRows.length, totalRows)}`} de {totalRows}
          </span>
          <div className="data-table__pagination-buttons">
            <button
              type="button"
              className="data-table__pagination-btn"
              onClick={() => onPageChange(1)}
              disabled={currentPage <= 1}
              aria-label="Primeira página"
              title="Primeira página"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 18V6h-2v12h2zM6 12l6-6v12L6 12z" /></svg>
            </button>
            <button
              type="button"
              className="data-table__pagination-btn"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Página anterior"
              title="Página anterior"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button
              type="button"
              className="data-table__pagination-btn"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Próxima página"
              title="Próxima página"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <button
              type="button"
              className="data-table__pagination-btn"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage >= totalPages}
              aria-label="Última página"
              title="Última página"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6v12h2V6H6zm12 0l-6 6v12l6-6V6z" /></svg>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
