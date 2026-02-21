/**
 * Hook: dados derivados da tabela SLA – filtros por cidade, ordenação, paginação, body rows.
 */
import { useMemo, useEffect, useCallback } from 'react'
import { applyColumnFilters } from '../SLA.js'

const PCT_COL_INDEX = 5

export default function useSLADerivedData({
  porMotorista,
  allPorMotorista,
  columnFilters,
  selectedCidades,
  setSelectedCidades,
  setPage,
  sortBy,
  sortDir,
  page,
  rowsPerPage,
  slaTableHeader,
}) {
  const cidadesOptions = useMemo(() => {
    const baseFilter = columnFilters[2]
    const basesSelecionadas = Array.isArray(baseFilter) && baseFilter.length > 0 ? baseFilter : null
    const set = new Set()
    allPorMotorista.forEach((m) => {
      if (basesSelecionadas) {
        const baseMotorista = (m.base ?? '(sem base)').trim().toLowerCase()
        const pertenceBase = basesSelecionadas.some((b) => String(b).trim().toLowerCase() === baseMotorista)
        if (!pertenceBase) return
      }
      ;(m.cidades || []).forEach((c) => {
        if (c && c.trim()) set.add(c)
      })
    })
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [allPorMotorista, columnFilters])

  const filteredByCidades = useMemo(
    () =>
      selectedCidades.length === 0
        ? porMotorista
        : porMotorista.filter((m) => (m.cidades || []).some((c) => selectedCidades.includes(c))),
    [porMotorista, selectedCidades]
  )

  useEffect(() => {
    if (selectedCidades.length === 0) return
    const cidadesValidas = selectedCidades.filter((c) => cidadesOptions.includes(c))
    if (cidadesValidas.length !== selectedCidades.length) {
      setSelectedCidades(cidadesValidas)
      setPage(1)
    }
  }, [cidadesOptions]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredPorMotorista = useMemo(
    () => applyColumnFilters(filteredByCidades, columnFilters),
    [filteredByCidades, columnFilters]
  )

  const porBaseParaModal = useMemo(() => {
    const byBase = new Map()
    filteredPorMotorista.forEach((m) => {
      const base = (m.base ?? '(sem base)').trim() || '(sem base)'
      let cur = byBase.get(base)
      if (!cur) {
        cur = { nome: base, totalEntregues: 0, naoEntregues: 0 }
        byBase.set(base, cur)
      }
      cur.totalEntregues += Number(m.totalEntregues) || 0
      cur.naoEntregues += Number(m.naoEntregues) || 0
    })
    return [...byBase.values()].map((b) => {
      const total = b.totalEntregues + b.naoEntregues
      return {
        ...b,
        total,
        percentualSla: total > 0 ? Math.round((b.totalEntregues / total) * 1000) / 10 : 0,
      }
    })
  }, [filteredPorMotorista])

  const sortedPorMotorista = useMemo(() => {
    const list = [...filteredPorMotorista]
    const isNum = (key) => key === 'total' || key === 'totalEntregues' || key === 'naoEntregues' || key === 'percentualSla'
    list.sort((a, b) => {
      const va = a[sortBy] ?? (sortBy === 'base' ? '(sem base)' : '')
      const vb = b[sortBy] ?? (sortBy === 'base' ? '(sem base)' : '')
      if (isNum(sortBy)) {
        const na = Number(va)
        const nb = Number(vb)
        if (sortDir === 'asc') return na - nb
        return nb - na
      }
      const cmp = String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filteredPorMotorista, sortBy, sortDir])

  const totalMotoristas = sortedPorMotorista.length
  const totalPages = Math.max(1, Math.ceil(totalMotoristas / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * rowsPerPage

  const bodyRowsPaginated = useMemo(
    () =>
      sortedPorMotorista.slice(start, start + rowsPerPage).map((m, i) => {
        const total = m.total ?? (m.totalEntregues + (m.naoEntregues ?? 0))
        return {
          _id: `sla-m-${start + i}-${m.nome}-${m.base ?? ''}`,
          values: [
            m.nome,
            m.base ?? '(sem base)',
            String(m.totalEntregues),
            String(m.naoEntregues ?? 0),
            String(total),
            `${m.percentualSla}%`,
            String(m.entradasGalpao ?? 0),
          ],
          cidades: m.cidades || [],
        }
      }),
    [sortedPorMotorista, start, rowsPerPage]
  )

  const goToPage = useCallback(
    (p) => {
      setPage((prev) => Math.max(1, Math.min(p, totalPages)))
    },
    [totalPages, setPage]
  )

  const numFilterCols = 1 + (slaTableHeader?.length ?? 0)
  const activeFilterColIndices = useMemo(() => {
    const indices = []
    for (let colIdx = 0; colIdx < numFilterCols; colIdx++) {
      if ((Array.isArray(columnFilters[colIdx]) ? columnFilters[colIdx].length : 0) > 0) indices.push(colIdx)
    }
    return indices
  }, [columnFilters, numFilterCols])

  return {
    cidadesOptions,
    filteredPorMotorista,
    porBaseParaModal,
    bodyRowsPaginated,
    totalMotoristas,
    totalPages,
    currentPage,
    start,
    goToPage,
    numFilterCols,
    activeFilterColIndices,
    pctColIndex: PCT_COL_INDEX,
  }
}
