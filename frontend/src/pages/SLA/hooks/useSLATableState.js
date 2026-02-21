/**
 * Hook: estado da tabela SLA – paginação, filtros por coluna, ordenação, dropdowns.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  SLA_SORT_STORAGE_KEY,
  SLA_BASE_FILTER_STORAGE_KEY,
  getInitialSort,
  applyColumnFilters,
} from '../SLA.js'
import { getFullConfig } from '../../Profile/Profile.js'
import { updateConfig } from '../../../services'

export default function useSLATableState({
  user,
  setUser,
  token,
  porMotorista,
  indicadoresLoading,
  rowsPerPageOptions = [10, 25, 50, 100, 200, 500],
  selectedBases: controlledSelectedBases,
  setSelectedBases: controlledSetSelectedBases,
  selectedPeriodo: controlledSelectedPeriodo,
  setSelectedPeriodo: controlledSetSelectedPeriodo,
}) {
  const initialRowsPerPage = rowsPerPageOptions.includes(Number(user?.config?.linhas_por_pagina))
    ? Number(user?.config?.linhas_por_pagina)
    : 25

  const [internalBases, setInternalBases] = useState([])
  const [internalPeriodo, setInternalPeriodo] = useState('Todos')
  const selectedBases = controlledSelectedBases !== undefined ? controlledSelectedBases : internalBases
  const setSelectedBases = controlledSetSelectedBases ?? setInternalBases
  const selectedPeriodo = controlledSelectedPeriodo !== undefined ? controlledSelectedPeriodo : internalPeriodo
  const setSelectedPeriodo = controlledSetSelectedPeriodo ?? setInternalPeriodo

  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage)
  const [columnFilters, setColumnFilters] = useState({})
  const [openFilterIndex, setOpenFilterIndex] = useState(null)
  const [filterSearchTerm, setFilterSearchTerm] = useState('')
  const [filterDropdownAnchorRect, setFilterDropdownAnchorRect] = useState(null)
  const [sort, setSort] = useState(getInitialSort)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  const tableWrapRef = useRef(null)
  const sortDropdownRef = useRef(null)
  const hasRestoredBaseFilterRef = useRef(false)

  const sortBy = sort.sortBy
  const sortDir = sort.sortDir

  useEffect(() => {
    try {
      localStorage.setItem(SLA_SORT_STORAGE_KEY, JSON.stringify({ sortBy, sortDir }))
    } catch {
      /* ignore */
    }
  }, [sortBy, sortDir])

  useEffect(() => {
    const bases = user?.config?.bases_sla
    if (!Array.isArray(bases)) return
    setSelectedBases(bases)
  }, [user?.config?.bases_sla]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1)
  }, [porMotorista])

  useEffect(() => {
    if (porMotorista.length === 0 || hasRestoredBaseFilterRef.current) return
    hasRestoredBaseFilterRef.current = true
    try {
      const saved = localStorage.getItem(SLA_BASE_FILTER_STORAGE_KEY)
      const base = (saved || '').trim()
      if (!base) return
      const basesSet = new Set(porMotorista.map((m) => (m.base ?? '(sem base)').trim()).filter(Boolean))
      if (!basesSet.has(base)) return
      setColumnFilters((prev) => ({ ...prev, 2: [base] }))
    } catch {
      /* ignore */
    }
  }, [porMotorista])

  useEffect(() => {
    const saved = rowsPerPageOptions.includes(Number(user?.config?.linhas_por_pagina))
      ? Number(user?.config?.linhas_por_pagina)
      : 25
    setRowsPerPage((prev) => (prev !== saved ? saved : prev))
  }, [user?.config?.linhas_por_pagina, rowsPerPageOptions])

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
    if (!sortDropdownOpen) return
    function handleClickOutside(e) {
      if (sortDropdownRef.current?.contains(e.target)) return
      setSortDropdownOpen(false)
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [sortDropdownOpen])

  useEffect(() => {
    if (indicadoresLoading) {
      setOpenFilterIndex(null)
      setSortDropdownOpen(false)
    }
  }, [indicadoresLoading])

  const toggleColumnFilterValue = useCallback((colIndex, value) => {
    const trimmed = String(value ?? '').trim()
    setColumnFilters((prev) => {
      const next = { ...prev }
      if (colIndex === 2) {
        const current = Array.isArray(prev[2]) ? prev[2] : []
        const alreadySelected = current.includes(trimmed)
        if (alreadySelected) {
          delete next[2]
          try {
            localStorage.removeItem(SLA_BASE_FILTER_STORAGE_KEY)
          } catch {
            /* ignore */
          }
        } else {
          next[2] = [trimmed]
          try {
            localStorage.setItem(SLA_BASE_FILTER_STORAGE_KEY, trimmed)
          } catch {
            /* ignore */
          }
        }
      } else {
        const arr = Array.isArray(prev[colIndex]) ? [...prev[colIndex]] : []
        const i = arr.indexOf(trimmed)
        if (i >= 0) arr.splice(i, 1)
        else arr.push(trimmed)
        next[colIndex] = arr.length ? arr : []
        if (next[colIndex].length === 0) delete next[colIndex]
      }
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
    if (colIndex === 2) {
      try {
        localStorage.removeItem(SLA_BASE_FILTER_STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
    setColumnFilters((prev) => {
      const next = { ...prev }
      delete next[colIndex]
      return next
    })
    setOpenFilterIndex(null)
    setPage(1)
  }, [])

  const getUniqueColumnValues = useCallback(
    (colIndex) => {
      if (colIndex === 0) {
        return Array.from({ length: porMotorista.length }, (_, i) => String(i + 1))
      }
      const seen = new Set()
      porMotorista.forEach((m) => {
        const total = m.total ?? (m.totalEntregues + (m.naoEntregues ?? 0))
        const val =
          colIndex === 1
            ? m.nome
            : colIndex === 2
              ? (m.base ?? '(sem base)')
              : colIndex === 3
                ? String(m.totalEntregues)
                : colIndex === 4
                  ? String(m.naoEntregues ?? 0)
                  : colIndex === 5
                    ? String(total)
                    : `${m.percentualSla}%`
        const s = String(val ?? '').trim()
        if (s) seen.add(s)
      })
      return [...seen].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    },
    [porMotorista]
  )

  function handleHeaderClick(filterColIndex, event) {
    const rect = event.target.getBoundingClientRect()
    if (openFilterIndex === filterColIndex) {
      setOpenFilterIndex(null)
      return
    }
    setFilterSearchTerm('')
    setFilterDropdownAnchorRect({ top: rect.bottom, left: rect.left, width: rect.width, height: rect.height })
    setOpenFilterIndex(filterColIndex)
  }

  const handleRowsPerPageChange = useCallback(
    (newRowsPerPage) => {
      setRowsPerPage(newRowsPerPage)
      setPage(1)
      if (!token || !user) return
      const config = user?.config ?? {}
      const fullConfig = getFullConfig(config, { linhas_por_pagina: newRowsPerPage })
      updateConfig(token, fullConfig)
        .then((data) => setUser({ ...user, config: data.config ?? fullConfig }))
        .catch(() => {})
    },
    [token, user, setUser]
  )

  return {
    selectedBases,
    setSelectedBases,
    selectedPeriodo,
    setSelectedPeriodo,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    columnFilters,
    setColumnFilters,
    openFilterIndex,
    setOpenFilterIndex,
    filterSearchTerm,
    setFilterSearchTerm,
    filterDropdownAnchorRect,
    setFilterDropdownAnchorRect,
    sort,
    setSort,
    sortDropdownOpen,
    setSortDropdownOpen,
    sortBy,
    sortDir,
    tableWrapRef,
    sortDropdownRef,
    toggleColumnFilterValue,
    isColumnFilterValueSelected,
    clearColumnFilter,
    getUniqueColumnValues,
    handleHeaderClick,
    handleRowsPerPageChange,
  }
}
