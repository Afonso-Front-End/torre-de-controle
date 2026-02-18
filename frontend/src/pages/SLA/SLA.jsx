import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { MdOutlineDelete, MdSort, MdSettings, MdEdit, MdTune, MdClose, MdCheckBox, MdCheckBoxOutlineBlank, MdAssessment, MdUpdate, MdUpload } from 'react-icons/md'
import { useAppContext, useNotification } from '../../context'
import DateFilterSelect from '../../components/DateFilterSelect'
import DataTable from '../VerificarPedidosParados/VerificarPedidos/DataTable'
import { SLAHeader, SLAImportDrop, BaseFilterSelect, SLAConfigModal, SLADadosModal, SLAPercentCell, SLAAcompanhamentoModal, SLANaoEntreguesModal } from './components'
import {
  SLA_PAGE_TITLE,
  SLA_PAGE_DESC,
  SLA_SORT_STORAGE_KEY,
  SLA_BASE_FILTER_STORAGE_KEY,
  SLA_ACOMPANHAMENTO_STORAGE_KEY,
  CONFIG_KEY_SLA_ACOMPANHAMENTO,
  VALID_TIPO_ACOMPANHAMENTO,
  SORT_OPTIONS,
  getInitialSort,
  getTipoAcompanhamentoFromConfig,
  applyColumnFilters,
} from './SLA.js'
import useSLATabela, { getTodayDateString } from './hooks/useSLATabela'
import { getSLADatas, getSLAIndicadores, updateConfig, atualizarSLATabela, salvarEntradaGalpao, getSLANaoEntregues, getSLAEntradaGalpao, getSLAEntregues } from '../../services'
import { getFullConfig, LINHAS_OPTIONS } from '../Profile/Profile.js'
import '../VerificarPedidosParados/VerificarPedidos/VerificarPedidosParados.css'
import './css/sla.css'

/** Mesmas opções do Perfil (Linhas por página) para usar o valor salvo no servidor */
const ROWS_PER_PAGE_OPTIONS = LINHAS_OPTIONS

export default function SLA() {
  const { user, setUser, refetchUser } = useAppContext()
  const { showNotification } = useNotification()
  const token = user?.token
  const tableWrapRef = useRef(null)
  const atualizarSLAInputRef = useRef(null)
  

  /* Igual Perfil e Resultados: valor de user.config.linhas_por_pagina (servidor / contexto); default 25 como no Perfil */
  const initialRowsPerPage = ROWS_PER_PAGE_OPTIONS.includes(Number(user?.config?.linhas_por_pagina))
    ? Number(user?.config?.linhas_por_pagina)
    : 25

  const {
    hasData,
    loadingLista,
    selectedDatas,
    setSelectedDatas,
    handleDeletar,
    deleting,
    refetchPage,
  } = useSLATabela(token, 100)

  const [selectedBases, setSelectedBases] = useState([])
  const [porMotorista, setPorMotorista] = useState([])
  const [porBase, setPorBase] = useState([])
  const [slaTableHeader, setSlaTableHeader] = useState([])
  const [fullPorBase, setFullPorBase] = useState([])
  const [allPorMotorista, setAllPorMotorista] = useState([]) // Todos os motoristas sem filtro de cidade
  const [indicadoresLoading, setIndicadoresLoading] = useState(false)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [allBasesForConfig, setAllBasesForConfig] = useState([])
  const [loadingBasesForConfig, setLoadingBasesForConfig] = useState(false)
  const [savingBasesConfig, setSavingBasesConfig] = useState(false)
  const [selectedPeriodo, setSelectedPeriodo] = useState('Todos')

  const savedBasesSla = user?.config?.bases_sla
  const hasSavedBases = Array.isArray(savedBasesSla) && savedBasesSla.length > 0
  const basesForFilter = hasSavedBases ? savedBasesSla : fullPorBase
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage)
  const [columnFilters, setColumnFilters] = useState({})
  const [openFilterIndex, setOpenFilterIndex] = useState(null)
  const [filterSearchTerm, setFilterSearchTerm] = useState('')
  const [filterDropdownAnchorRect, setFilterDropdownAnchorRect] = useState(null)
  const [sort, setSort] = useState(getInitialSort)
  const sortBy = sort.sortBy
  const sortDir = sort.sortDir
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const sortDropdownRef = useRef(null)
  const [tipoAcompanhamento, setTipoAcompanhamento] = useState(() => getTipoAcompanhamentoFromConfig(user))
  const [acompanhamentoModalOpen, setAcompanhamentoModalOpen] = useState(false)
  const [savingAcompanhamento, setSavingAcompanhamento] = useState(false)
  const [dadosModalOpen, setDadosModalOpen] = useState(false)
  const [naoEntreguesModalOpen, setNaoEntreguesModalOpen] = useState(false)
  const [naoEntreguesModalMotorista, setNaoEntreguesModalMotorista] = useState('')
  const [naoEntreguesModalBase, setNaoEntreguesModalBase] = useState('')
  const [naoEntreguesModalTipo, setNaoEntreguesModalTipo] = useState('nao-entregues') // 'nao-entregues' | 'entrada-galpao' | 'entregues'
  const [cidadesFilterOpen, setCidadesFilterOpen] = useState(false)
  const [selectedCidades, setSelectedCidades] = useState([])
  const [cidadesFilterSearchTerm, setCidadesFilterSearchTerm] = useState('')
  const [cidadesFilterAnchorRect, setCidadesFilterAnchorRect] = useState(null)
  const cidadesFilterRef = useRef(null)
  const cidadesFilterBtnRef = useRef(null)
  const hasRestoredBaseFilterRef = useRef(false)
  const [atualizandoSLA, setAtualizandoSLA] = useState(false)
  const [importingFirstFile, setImportingFirstFile] = useState(false)
  const [atualizandoEntradaGalpao, setAtualizandoEntradaGalpao] = useState(false)
  const entradaGalpaoInputRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(SLA_SORT_STORAGE_KEY, JSON.stringify({ sortBy, sortDir }))
    } catch {
      /* ignore */
    }
  }, [sortBy, sortDir])

  /* Sincronizar tipo de acompanhamento com a config do servidor quando user/config mudar */
  useEffect(() => {
    const fromConfig = getTipoAcompanhamentoFromConfig(user)
    setTipoAcompanhamento(fromConfig)
  }, [user?.config?.[CONFIG_KEY_SLA_ACOMPANHAMENTO]])

  const fetchSLADatas = useCallback(() => (token ? getSLADatas(token) : Promise.resolve({ datas: [] })), [token])

  const fetchIndicadores = useCallback(async () => {
    if (!token || !hasData) return
    setIndicadoresLoading(true)
    try {
      /** Usar as datas selecionadas pelo usuário (ou data de hoje se nenhuma selecionada) */
      const datasParam = selectedDatas.length > 0 ? selectedDatas : [getTodayDateString()]
      const basesParam = selectedBases.length > 0 ? selectedBases : null
      const periodoParam = selectedPeriodo === 'Todos' ? null : selectedPeriodo
      const cidadesParam = selectedCidades.length > 0 ? selectedCidades : null
      
      // Buscar dados filtrados (para exibição na tabela)
      const res = await getSLAIndicadores(token, datasParam, basesParam, periodoParam, cidadesParam)
      setPorMotorista(res.porMotorista || [])
      setPorBase(res.porBase || [])
      setSlaTableHeader(Array.isArray(res.header) ? res.header : [])
      
      // Buscar TODOS os motoristas SEM filtro de cidade (para popular cidadesOptions)
      const resAll = await getSLAIndicadores(token, datasParam, basesParam, periodoParam, null)
      setAllPorMotorista(resAll.porMotorista || [])
      
      if (selectedBases.length === 0) {
        setFullPorBase((res.porBase || []).map((b) => b.nome))
      }
    } catch {
      setPorMotorista([])
      setPorBase([])
      setSlaTableHeader([])
      setAllPorMotorista([])
    } finally {
      setIndicadoresLoading(false)
    }
  }, [token, hasData, selectedDatas, selectedBases, selectedPeriodo, selectedCidades])

  useEffect(() => {
    if (hasData) fetchIndicadores()
  }, [hasData, fetchIndicadores])

  useEffect(() => {
    setPage(1)
  }, [porMotorista])

  /* Log dos dados para debug */
  // useEffect(() => {
  //   console.log('[SLA] Dados atuais:', {
  //     porMotorista,
  //     porBase,
  //     slaTableHeader,
  //     totalMotoristas: porMotorista.length,
  //   })
  // }, [porMotorista, porBase, slaTableHeader])

  /* Trazer user do servidor ao montar (como fazem noutras páginas) para ter config.linhas_por_pagina atualizado */
  useEffect(() => {
    if (token) refetchUser?.()
  }, [token, refetchUser])

  /* Sincronizar selectedBases com a config (bases_sla): o que foi guardado no modal aparece no filtro de base. */
  useEffect(() => {
    const bases = user?.config?.bases_sla
    if (!Array.isArray(bases)) return
    setSelectedBases(bases)
  }, [user?.config?.bases_sla])

  /* Restaurar base selecionada (filtro coluna Base de entrega) do localStorage ao carregar dados, uma vez. */
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

  /* Quando user é atualizado (ex.: após refetch), alinhar rowsPerPage ao valor do servidor */
  useEffect(() => {
    const saved = ROWS_PER_PAGE_OPTIONS.includes(Number(user?.config?.linhas_por_pagina))
      ? Number(user?.config?.linhas_por_pagina)
      : 25
    setRowsPerPage((prev) => (prev !== saved ? saved : prev))
  }, [user?.config?.linhas_por_pagina])

  /* Ao abrir o modal de config, carregar lista de todas as bases (sem filtro) */
  useEffect(() => {
    if (!configModalOpen || !token || !hasData) return
    setLoadingBasesForConfig(true)
    getSLAIndicadores(token, null, null)
      .then((res) => setAllBasesForConfig((res.porBase || []).map((b) => b.nome)))
      .catch(() => setAllBasesForConfig([]))
      .finally(() => setLoadingBasesForConfig(false))
  }, [configModalOpen, token, hasData])

  const handleSaveBasesConfig = useCallback(
    async (bases) => {
      if (!token || !user) return
      setSavingBasesConfig(true)
      try {
        const nextConfig = { ...(user.config ?? {}), bases_sla: bases }
        const data = await updateConfig(token, nextConfig)
        setUser({ ...user, config: data.config ?? nextConfig })
        setSelectedBases(bases)
      } finally {
        setSavingBasesConfig(false)
      }
    },
    [token, user, setUser]
  )

  const handleSaveAcompanhamento = useCallback(
    async (tipo) => {
      if (!token || !user) return
      setSavingAcompanhamento(true)
      try {
        const nextConfig = { ...(user.config ?? {}), [CONFIG_KEY_SLA_ACOMPANHAMENTO]: tipo }
        const data = await updateConfig(token, nextConfig)
        setUser({ ...user, config: data.config ?? nextConfig })
        setTipoAcompanhamento(tipo)
        setAcompanhamentoModalOpen(false)
        try {
          localStorage.setItem(SLA_ACOMPANHAMENTO_STORAGE_KEY, tipo)
        } catch {
          /* ignore */
        }
      } finally {
        setSavingAcompanhamento(false)
      }
    },
    [token, user, setUser]
  )

  const handleRowsPerPageChange = useCallback(
    (newRowsPerPage) => {
      setRowsPerPage(newRowsPerPage)
      setPage(1)
      if (!token || !user) return
      const config = user?.config ?? {}
      const fullConfig = getFullConfig(config, { linhas_por_pagina: newRowsPerPage })
      updateConfig(token, fullConfig)
        .then((data) => setUser({ ...user, config: data.config ?? fullConfig }))
        .catch(() => { })
    },
    [token, user, setUser]
  )

  const onImportSuccess = useCallback(async () => {
    await refetchPage(1)
    await fetchIndicadores()
  }, [refetchPage, fetchIndicadores])

  const handleAtualizarSLA = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const ext = (file.name || '').toLowerCase()
      if (!ext.endsWith('.xlsx')) {
        showNotification?.('Envie um arquivo Excel (.xlsx).', 'error')
        e.target.value = ''
        return
      }
      if (!token) {
        showNotification?.('Sessão expirada. Faça login novamente.', 'error')
        return
      }
      setAtualizandoSLA(true)
      try {
        const res = await atualizarSLATabela(token, file)
        const up = res.updated ?? 0
        const ins = res.inserted ?? 0
        showNotification?.(`SLA atualizado: ${up} linha(s) atualizada(s), ${ins} nova(s) inserida(s).`, 'success')
        if (atualizarSLAInputRef.current) atualizarSLAInputRef.current.value = ''
        refetchPage(1)
        fetchIndicadores()
      } catch (err) {
        showNotification?.(err?.message ?? 'Erro ao atualizar o Excel.', 'error')
      } finally {
        setAtualizandoSLA(false)
        e.target.value = ''
      }
    },
    [token, showNotification, refetchPage, fetchIndicadores]
  )

  const handleAtualizarEntradaGalpao = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const ext = (file.name || '').toLowerCase()
      if (!ext.endsWith('.xlsx')) {
        showNotification?.('Envie um arquivo Excel (.xlsx).', 'error')
        e.target.value = ''
        return
      }
      if (!token) {
        showNotification?.('Sessão expirada. Faça login novamente.', 'error')
        return
      }
      setAtualizandoEntradaGalpao(true)
      try {
        const res = await salvarEntradaGalpao(token, file)
        const saved = res.saved ?? 0
        showNotification?.(`Entrada no galpão atualizada: ${saved} linha(s) salva(s).`, 'success')
        if (entradaGalpaoInputRef.current) entradaGalpaoInputRef.current.value = ''
        fetchIndicadores()
      } catch (err) {
        showNotification?.(err?.message ?? 'Erro ao atualizar entrada no galpão.', 'error')
      } finally {
        setAtualizandoEntradaGalpao(false)
        e.target.value = ''
      }
    },
    [token, showNotification, fetchIndicadores]
  )

  /** Cidades disponíveis filtradas pela base selecionada (columnFilters[2]).
   * Se houver base selecionada, mostra apenas cidades dessa base.
   * Se não houver base selecionada, mostra todas as cidades.
   * Usa allPorMotorista (sem filtro de cidade) para não perder cidades quando uma é selecionada. */
  const cidadesOptions = useMemo(() => {
    const baseFilter = columnFilters[2]
    const basesSelecionadas = Array.isArray(baseFilter) && baseFilter.length > 0 ? baseFilter : null
    
    const set = new Set()
    // Usar allPorMotorista em vez de porMotorista para não perder cidades quando filtro de cidade é aplicado
    allPorMotorista.forEach((m) => {
      // Se há base selecionada, filtrar apenas motoristas dessa base
      if (basesSelecionadas) {
        const baseMotorista = (m.base ?? '(sem base)').trim().toLowerCase()
        const pertenceBase = basesSelecionadas.some((b) => String(b).trim().toLowerCase() === baseMotorista)
        if (!pertenceBase) return
      }
      // Adicionar cidades do motorista (apenas se não estiver vazia)
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

  /** Quando a base selecionada mudar (cidadesOptions mudou), manter apenas as cidades selecionadas que pertencem à nova base */
  useEffect(() => {
    if (selectedCidades.length === 0) return
    const cidadesValidas = selectedCidades.filter((c) => cidadesOptions.includes(c))
    if (cidadesValidas.length !== selectedCidades.length) {
      setSelectedCidades(cidadesValidas)
      setPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidadesOptions])

  const filteredPorMotorista = useMemo(
    () => applyColumnFilters(filteredByCidades, columnFilters),
    [filteredByCidades, columnFilters]
  )

  /** Resumo por base a partir dos motoristas já filtrados (tabela + cidade), para o modal de dados */
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

  const goToPage = useCallback((p) => {
    setPage((prev) => Math.max(1, Math.min(p, totalPages)))
  }, [totalPages])

  /* Coluna 2 = Base de entrega: apenas 1 base por vez (single-select); guardar no localStorage. */
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

  const numFilterCols = 1 + (slaTableHeader?.length ?? 0)
  const activeFilterColIndices = useMemo(() => {
    const indices = []
    for (let colIdx = 0; colIdx < numFilterCols; colIdx++) {
      if ((Array.isArray(columnFilters[colIdx]) ? columnFilters[colIdx].length : 0) > 0) indices.push(colIdx)
    }
    return indices
  }, [columnFilters, numFilterCols])

  const pctColIndex = 5

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
    if (!cidadesFilterOpen) return
    function handleClickOutside(e) {
      if (cidadesFilterRef.current?.contains(e.target) || cidadesFilterBtnRef.current?.contains(e.target)) return
      setCidadesFilterOpen(false)
      setCidadesFilterAnchorRect(null)
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [cidadesFilterOpen])

  useEffect(() => {
    if (!cidadesFilterOpen) setCidadesFilterSearchTerm('')
  }, [cidadesFilterOpen])

  useEffect(() => {
    if (indicadoresLoading) {
      setCidadesFilterOpen(false)
      setCidadesFilterAnchorRect(null)
      setOpenFilterIndex(null)
      setSortDropdownOpen(false)
    }
  }, [indicadoresLoading])

  if (loadingLista && !hasData && !importingFirstFile) {
    return (
      <div className="sla" aria-busy="true">
        <SLAHeader title={SLA_PAGE_TITLE} description={SLA_PAGE_DESC} />
        <section className="sla__enviar" aria-hidden>
          <span className="sla__loading-text">A carregar…</span>
        </section>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="sla">
        <SLAHeader title={SLA_PAGE_TITLE} description={SLA_PAGE_DESC} />
        <section className="sla__enviar">
          <SLAImportDrop token={token} onImportSuccess={onImportSuccess} onLoadingChange={setImportingFirstFile} />
        </section>
        {importingFirstFile && (
          <div className="sla__loading-overlay" role="status" aria-live="polite" aria-busy="true">
            <div className="sla__loading-modal">
              <div className="sla__loading-spinner" aria-hidden />
              <p className="sla__loading-title">A importar tabela SLA</p>
              <p className="sla__loading-desc">O ficheiro está a ser processado no servidor. Pode demorar vários minutos em ficheiros grandes.</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="sla sla--tabela">
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
          {/* Filtro por base de entrega — comentado para não exibir
          <BaseFilterSelect
            bases={basesForFilter}
            selectedBases={selectedBases}
            onChange={setSelectedBases}
            singleSelect
            disabled={deleting || indicadoresLoading}
            className="sla__base-filter"
          />
          */}
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
            onClick={() => setDadosModalOpen(true)}
            disabled={indicadoresLoading || !hasData}
            title="Ver dados SLA – resumo completo"
            aria-label="Ver dados SLA – resumo completo"
          >
            <MdAssessment className="sla__btn-dados-icon" aria-hidden />
          </button>
          <input
            ref={atualizarSLAInputRef}
            type="file"
            accept=".xlsx"
            className="sla__atualizar-input"
            onChange={handleAtualizarSLA}
            disabled={atualizandoSLA || indicadoresLoading}
            aria-hidden
          />
          <button
            type="button"
            className="sla__btn-atualizar"
            onClick={() => atualizarSLAInputRef.current?.click()}
            disabled={atualizandoSLA || indicadoresLoading || !hasData}
            title="Atualizar tabela SLA com Excel (atualiza existentes e adiciona novos)"
            aria-label="Atualizar tabela SLA com Excel"
          >
            <MdUpdate className="sla__btn-atualizar-icon" aria-hidden />
          </button>
          <input
            ref={entradaGalpaoInputRef}
            type="file"
            accept=".xlsx"
            className="sla__atualizar-input"
            onChange={handleAtualizarEntradaGalpao}
            aria-hidden
          />
          <button
            type="button"
            className="sla__btn-atualizar"
            onClick={() => entradaGalpaoInputRef.current?.click()}
            disabled={atualizandoEntradaGalpao || indicadoresLoading || !hasData}
            title="Importar arquivo Excel de entrada no galpão"
            aria-label="Importar arquivo Excel de entrada no galpão"
          >
            <MdUpload className="sla__btn-atualizar-icon" aria-hidden />
          </button>
          <button
            type="button"
            className="sla__btn-config"
            onClick={() => setConfigModalOpen(true)}
            disabled={indicadoresLoading || !hasData}
            title="Configurar bases de entrega"
            aria-label="Configurar bases de entrega"
          >
            <MdSettings className="sla__btn-config-icon" aria-hidden />
          </button>
          <button
            type="button"
            className="sla__btn-delete"
            onClick={handleDeletar}
            disabled={deleting}
            title="Apagar todos os dados"
            aria-label="Apagar todos os dados"
          >
            <MdOutlineDelete className="sla__btn-delete-icon" />
          </button>
        </div>
      </div>

      <SLAConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        allBases={allBasesForConfig}
        savedBases={savedBasesSla ?? []}
        onSave={handleSaveBasesConfig}
        saving={savingBasesConfig}
        loadingBases={loadingBasesForConfig}
      />
      <SLAAcompanhamentoModal
        open={acompanhamentoModalOpen}
        onClose={() => setAcompanhamentoModalOpen(false)}
        tipoAtual={tipoAcompanhamento}
        onSelect={handleSaveAcompanhamento}
        saving={savingAcompanhamento}
      />
      <SLADadosModal
        open={dadosModalOpen}
        onClose={() => setDadosModalOpen(false)}
        header={slaTableHeader}
        porBase={porBaseParaModal}
        porMotorista={filteredPorMotorista}
        selectedCidades={selectedCidades}
        tipoAcompanhamento={tipoAcompanhamento}
      />
      <SLANaoEntreguesModal
        open={naoEntreguesModalOpen}
        onClose={() => {
          setNaoEntreguesModalOpen(false)
          setNaoEntreguesModalMotorista('')
          setNaoEntreguesModalBase('')
          setNaoEntreguesModalTipo('nao-entregues')
        }}
        token={token}
        motorista={naoEntreguesModalMotorista}
        base={naoEntreguesModalBase}
        datas={selectedDatas.length > 0 ? selectedDatas : [getTodayDateString()]}
        periodo={selectedPeriodo === 'Todos' ? null : selectedPeriodo}
        cidades={selectedCidades.length > 0 ? selectedCidades : null}
        tipo={naoEntreguesModalTipo}
      />

      {atualizandoSLA && (
        <div className="sla__loading-overlay" role="status" aria-live="polite" aria-busy="true">
          <div className="sla__loading-modal">
            <div className="sla__loading-spinner" aria-hidden />
            <p className="sla__loading-title">A atualizar tabela SLA</p>
            <p className="sla__loading-desc">O ficheiro está a ser processado no servidor. Pode demorar vários minutos em ficheiros grandes.</p>
          </div>
        </div>
      )}

      {cidadesFilterOpen && cidadesFilterAnchorRect && (
        <div
          ref={cidadesFilterRef}
          className="verificar-pedidos__filter-dropdown verificar-pedidos__filter-dropdown--menu sla__cidades-filter-dropdown-pos sla__cidades-filter-dropdown--fixed"
          style={{
            position: 'fixed',
            top: cidadesFilterAnchorRect.bottom + 6,
            left: cidadesFilterAnchorRect.left,
            minWidth: Math.max(cidadesFilterAnchorRect.width, 240),
            maxWidth: 320,
            height: '70vh',
            maxHeight: 420,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="verificar-pedidos__filter-dropdown-inner">
            <div className="verificar-pedidos__filter-dropdown-search-wrap">
              <input
                type="text"
                className="verificar-pedidos__filter-dropdown-search"
                placeholder="Pesquisar..."
                value={cidadesFilterSearchTerm}
                onChange={(e) => setCidadesFilterSearchTerm(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
            <div className="verificar-pedidos__filter-dropdown-list">
              <div className="verificar-pedidos__filter-menu">
                {cidadesOptions.length === 0 ? (
                  <p className="sla__cidades-filter-empty">Nenhuma cidade nos dados.</p>
                ) : (
                  cidadesOptions
                    .filter((cidade) =>
                      String(cidade).toLowerCase().includes(cidadesFilterSearchTerm.trim().toLowerCase())
                    )
                    .map((cidade) => {
                      const checked = selectedCidades.includes(cidade)
                      return (
                        <button
                          key={cidade}
                          type="button"
                          className={`verificar-pedidos__filter-menu-item ${checked ? 'verificar-pedidos__filter-menu-item--selected' : ''}`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setSelectedCidades((prev) => {
                              // Garantir que prev é sempre um array
                              const prevArray = Array.isArray(prev) ? prev : []
                              const cidadeExiste = prevArray.includes(cidade)
                              if (cidadeExiste) {
                                // Remover cidade se já estiver selecionada
                                return prevArray.filter((c) => c !== cidade)
                              } else {
                                // Adicionar cidade se não estiver selecionada (mantendo as outras)
                                return [...prevArray, cidade].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                              }
                            })
                            setPage(1)
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <span className="verificar-pedidos__filter-menu-icon" aria-hidden>
                            {checked ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                            )}
                          </span>
                          <span className="verificar-pedidos__filter-menu-text">{cidade}</span>
                        </button>
                      )
                    })
                )}
              </div>
            </div>
            <div className="verificar-pedidos__filter-dropdown-footer">
              <div className="verificar-pedidos__filter-menu-separator" />
              <div className="sla__cidades-filter-footer-actions">
                <button
                  type="button"
                  className="sla__cidades-filter-footer-btn"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedCidades([])
                    setPage(1)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  title="Limpar"
                  aria-label="Limpar"
                >
                  <MdClose size={20} aria-hidden />
                </button>
                <button
                  type="button"
                  className="sla__cidades-filter-footer-btn"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedCidades([...cidadesOptions])
                    setPage(1)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  title="Selecionar todos"
                  aria-label="Selecionar todos"
                >
                  <MdCheckBox size={20} aria-hidden />
                </button>
                <button
                  type="button"
                  className="sla__cidades-filter-footer-btn"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedCidades([])
                    setPage(1)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  title="Desmarcar todos"
                  aria-label="Desmarcar todos"
                >
                  <MdCheckBoxOutlineBlank size={20} aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                onRowsPerPageChange={handleRowsPerPageChange}
                onPageChange={goToPage}
                onHeaderClick={handleHeaderClick}
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
                          setAcompanhamentoModalOpen(true)
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
                          const rect = cidadesFilterBtnRef.current?.getBoundingClientRect()
                          if (rect) setCidadesFilterAnchorRect(rect)
                          setCidadesFilterOpen((o) => !o)
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
                    // Coluna "Total entregues"
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
                          setNaoEntreguesModalMotorista(motoristaNome)
                          setNaoEntreguesModalBase(baseNome)
                          setNaoEntreguesModalTipo('entregues')
                          setNaoEntreguesModalOpen(true)
                        }}
                        title={`Ver ${num} pedido(s) entregue(s)`}
                        aria-label={`Ver ${num} pedidos entregues de ${motoristaNome}`}
                      >
                        {value}
                      </button>
                    )
                  }
                  if (colIndex === 3) {
                    // Coluna "Não entregues"
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
                          setNaoEntreguesModalMotorista(motoristaNome)
                          setNaoEntreguesModalBase(baseNome)
                          setNaoEntreguesModalTipo('nao-entregues')
                          setNaoEntreguesModalOpen(true)
                        }}
                        title={`Ver ${num} pedido(s) não entregue(s)`}
                        aria-label={`Ver ${num} pedidos não entregues de ${motoristaNome}`}
                      >
                        {value}
                      </button>
                    )
                  }
                  if (colIndex === 6) {
                    // Coluna "Entrada do galpao"
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
                          setNaoEntreguesModalMotorista(motoristaNome)
                          setNaoEntreguesModalBase(baseNome)
                          setNaoEntreguesModalTipo('entrada-galpao')
                          setNaoEntreguesModalOpen(true)
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
                                  toggleColumnFilterValue(openFilterIndex, optionValue)
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
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
