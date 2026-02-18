import { useMemo } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import './EvolucaoTable.css'

/**
 * Tabela de pedidos na página Evolução com TanStack Table.
 *
 * @param {object[]} data - Lista de documentos (pedidos), ex.: pedidos.slice(0, 50)
 * @param {string[]} columns - Nomes das colunas, ex.: MOTORISTA_COLUMNS.slice(0, 7)
 * @param {string} marcaKey - Chave da coluna "Marca de assinatura" para renderizar pill
 * @param {function} getStatusPillClass - (marca) => classe CSS para o pill
 * @param {string} [title] - Título da secção
 * @param {string} [showMoreText] - Texto opcional "A mostrar 50 de N pedidos."
 */
export default function EvolucaoTable({
  data = [],
  columns = [],
  marcaKey = 'Marca de assinatura',
  getStatusPillClass = () => '',
  title = '',
  showMoreText = '',
}) {
  const columnDefs = useMemo(
    () =>
      columns.map((col) => ({
        accessorKey: col,
        header: col,
        cell: (info) => {
          const value = info.getValue()
          const display = value != null ? String(value) : '—'
          const isStatus = col === marcaKey
          if (isStatus && display !== '—') {
            return (
              <span className={`evolucao__table-pill ${getStatusPillClass(value)}`}>{display}</span>
            )
          }
          return display
        },
      })),
    [columns, marcaKey, getStatusPillClass]
  )

  const table = useReactTable({
    data,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) => row._id ?? String(index),
  })

  if (!data.length) return null

  return (
    <section className="evolucao-table">
      {title && <h2 className="evolucao-table__title">{title}</h2>}
      <div className="evolucao-table__wrap">
        <table className="evolucao-table__table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="evolucao-table__th">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="evolucao-table__tr">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="evolucao-table__td">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showMoreText && <p className="evolucao-table__more">{showMoreText}</p>}
    </section>
  )
}
