import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppContext, useNotification } from '../../context'
import { SLA_PAGE_TITLE, SLA_PAGE_DESC, CONFIG_KEY_SLA_ACOMPANHAMENTO } from './SLA.js'
import useSLATabela, { getTodayDateString } from './hooks/useSLATabela'
import useSLAIndicadores from './hooks/useSLAIndicadores'
import useSLATableState from './hooks/useSLATableState'
import useSLADerivedData from './hooks/useSLADerivedData'
import useSLAModals from './hooks/useSLAModals'
import { atualizarSLATabela, salvarEntradaGalpao, getSLADatas, updateConfig } from '../../services'
import { LINHAS_OPTIONS } from '../Profile/Profile.js'
import {
  SLAHeader,
  SLAImportSection,
  SLAToolbar,
  SLACidadesFilterDropdown,
  SLATableView,
  SLAConfigModal,
  SLAAcompanhamentoModal,
  SLADadosModal,
  SLANaoEntreguesModal,
} from './components'
import '../VerificarPedidosParados/VerificarPedidos/VerificarPedidosParados.css'
import './css/sla.css'

const ROWS_PER_PAGE_OPTIONS = LINHAS_OPTIONS

export default function SLA() {
  const { user, setUser, refetchUser } = useAppContext()
  const { showNotification } = useNotification()
  const token = user?.token
  const atualizarSLAInputRef = useRef(null)
  const entradaGalpaoInputRef = useRef(null)

  const {
    hasData,
    loadingLista,
    selectedDatas,
    setSelectedDatas,
    handleDeletar,
    deleting,
    refetchPage,
  } = useSLATabela(token, 100)

  const modals = useSLAModals()
  const {
    configModalOpen,
    setConfigModalOpen,
    acompanhamentoModalOpen,
    setAcompanhamentoModalOpen,
    dadosModalOpen,
    setDadosModalOpen,
    naoEntreguesModalOpen,
    setNaoEntreguesModalOpen,
    naoEntreguesModalMotorista,
    setNaoEntreguesModalMotorista,
    naoEntreguesModalBase,
    setNaoEntreguesModalBase,
    naoEntreguesModalTipo,
    setNaoEntreguesModalTipo,
    cidadesFilterOpen,
    setCidadesFilterOpen,
    cidadesFilterSearchTerm,
    setCidadesFilterSearchTerm,
    cidadesFilterAnchorRect,
    setCidadesFilterAnchorRect,
    cidadesFilterRef,
    cidadesFilterBtnRef,
  } = modals

  const [selectedBases, setSelectedBases] = useState([])
  const [selectedPeriodo, setSelectedPeriodo] = useState('Todos')
  const [selectedCidades, setSelectedCidades] = useState([])
  const [atualizandoSLA, setAtualizandoSLA] = useState(false)
  const [atualizandoEntradaGalpao, setAtualizandoEntradaGalpao] = useState(false)
  const [savingAcompanhamento, setSavingAcompanhamento] = useState(false)
  const [slaDatasDisponiveis, setSlaDatasDisponiveis] = useState([])
  const [dataParaAtualizarSLA, setDataParaAtualizarSLA] = useState('')
  const [atualizarDropdownOpen, setAtualizarDropdownOpen] = useState(false)

  useEffect(() => {
    const bases = user?.config?.bases_sla
    if (!Array.isArray(bases)) return
    setSelectedBases(bases)
  }, [user?.config?.bases_sla])

  const indicadores = useSLAIndicadores({
    token,
    hasData,
    user,
    setUser,
    selectedDatas,
    selectedBases,
    selectedPeriodo,
    selectedCidades,
    configModalOpen,
  })

  const {
    porMotorista,
    slaTableHeader,
    allPorMotorista,
    indicadoresLoading,
    fetchIndicadores,
    allBasesForConfig,
    loadingBasesForConfig,
    savingBasesConfig,
    handleSaveBasesConfig,
    tipoAcompanhamento,
    setTipoAcompanhamento,
  } = indicadores

  const tableState = useSLATableState({
    user,
    setUser,
    token,
    porMotorista,
    indicadoresLoading,
    rowsPerPageOptions: ROWS_PER_PAGE_OPTIONS,
    selectedBases,
    setSelectedBases,
    selectedPeriodo,
    setSelectedPeriodo,
  })

  const {
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    columnFilters,
    openFilterIndex,
    filterSearchTerm,
    setFilterSearchTerm,
    filterDropdownAnchorRect,
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
  } = tableState

  const derived = useSLADerivedData({
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
  })

  const {
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
    pctColIndex,
  } = derived

  useEffect(() => {
    if (token) refetchUser?.()
  }, [token, refetchUser])

  useEffect(() => {
    if (indicadoresLoading) {
      setCidadesFilterOpen(false)
      setCidadesFilterAnchorRect(null)
    }
  }, [indicadoresLoading, setCidadesFilterOpen, setCidadesFilterAnchorRect])

  const fetchSLADatas = useCallback(
    () => (token ? getSLADatas(token) : Promise.resolve({ datas: [] })),
    [token]
  )

  useEffect(() => {
    if (!hasData || !token) return
    let cancelled = false
    getSLADatas(token).then((res) => {
      if (cancelled) return
      const list = Array.isArray(res?.datas) ? res.datas : []
      setSlaDatasDisponiveis(list)
      if (list.length > 0) {
        setDataParaAtualizarSLA((prev) => (prev && list.includes(prev) ? prev : list[0]))
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [hasData, token])

  const onImportSuccess = useCallback(async () => {
    await refetchPage(1)
    await fetchIndicadores()
  }, [refetchPage, fetchIndicadores])

  const handleSaveBasesConfigWithBases = useCallback(
    async (bases) => {
      await handleSaveBasesConfig(bases)
      setSelectedBases(bases)
    },
    [handleSaveBasesConfig, setSelectedBases]
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
      } finally {
        setSavingAcompanhamento(false)
      }
    },
    [token, user, setUser, setTipoAcompanhamento, setAcompanhamentoModalOpen]
  )

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
      setAtualizarDropdownOpen(false)
      setAtualizandoSLA(true)
      try {
        const res = await atualizarSLATabela(token, file, dataParaAtualizarSLA || undefined)
        const up = res.updated ?? 0
        const ins = res.inserted ?? 0
        showNotification?.(`SLA atualizado: ${up} linha(s) atualizada(s), ${ins} nova(s) inserida(s).`, 'success')
        if (atualizarSLAInputRef.current) atualizarSLAInputRef.current.value = ''
        refetchPage(1)
        fetchIndicadores()
        getSLADatas(token).then((r) => {
          const list = Array.isArray(r?.datas) ? r.datas : []
          setSlaDatasDisponiveis(list)
          if (list.length > 0) setDataParaAtualizarSLA((prev) => (list.includes(prev) ? prev : list[0]))
        }).catch(() => {})
      } catch (err) {
        showNotification?.(err?.message ?? 'Erro ao atualizar o Excel.', 'error')
      } finally {
        setAtualizandoSLA(false)
        e.target.value = ''
      }
    },
    [token, showNotification, refetchPage, fetchIndicadores, dataParaAtualizarSLA]
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

  const handleCidadesFilterClick = useCallback(() => {
    const rect = cidadesFilterBtnRef.current?.getBoundingClientRect()
    if (rect) setCidadesFilterAnchorRect(rect)
    setCidadesFilterOpen((o) => !o)
  }, [setCidadesFilterAnchorRect, setCidadesFilterOpen])

  const handleToggleCidade = useCallback(
    (cidade) => {
      setSelectedCidades((prev) => {
        const prevArray = Array.isArray(prev) ? prev : []
        const cidadeExiste = prevArray.includes(cidade)
        if (cidadeExiste) {
          return prevArray.filter((c) => c !== cidade)
        }
        return [...prevArray, cidade].sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: 'base' })
        )
      })
      setPage(1)
    },
    [setPage]
  )

  const handleOpenNaoEntregues = useCallback(
    (motoristaNome, baseNome, tipo) => {
      setNaoEntreguesModalMotorista(motoristaNome)
      setNaoEntreguesModalBase(baseNome)
      setNaoEntreguesModalTipo(tipo)
      setNaoEntreguesModalOpen(true)
    },
    [setNaoEntreguesModalMotorista, setNaoEntreguesModalBase, setNaoEntreguesModalTipo, setNaoEntreguesModalOpen]
  )

  const savedBasesSla = user?.config?.bases_sla

  return (
    <div className={`sla ${hasData ? 'sla--tabela' : ''}`}>
      {/* <SLAHeader title={SLA_PAGE_TITLE} description={SLA_PAGE_DESC} /> */}
      <SLAToolbar
        token={token}
        fetchSLADatas={fetchSLADatas}
        selectedDatas={selectedDatas}
        setSelectedDatas={setSelectedDatas}
        selectedPeriodo={selectedPeriodo}
        setSelectedPeriodo={setSelectedPeriodo}
        sortBy={sortBy}
        sortDir={sortDir}
        setSort={setSort}
        setSortDropdownOpen={setSortDropdownOpen}
        sortDropdownOpen={sortDropdownOpen}
        sortDropdownRef={sortDropdownRef}
        totalMotoristas={totalMotoristas}
        setPage={setPage}
        indicadoresLoading={indicadoresLoading}
        hasData={hasData}
        deleting={deleting}
        onDadosClick={() => setDadosModalOpen(true)}
        atualizarSLAInputRef={atualizarSLAInputRef}
        onAtualizarSLAChange={handleAtualizarSLA}
        atualizandoSLA={atualizandoSLA}
        slaDatasDisponiveis={slaDatasDisponiveis}
        dataParaAtualizarSLA={dataParaAtualizarSLA}
        setDataParaAtualizarSLA={setDataParaAtualizarSLA}
        atualizarDropdownOpen={atualizarDropdownOpen}
        setAtualizarDropdownOpen={setAtualizarDropdownOpen}
        entradaGalpaoInputRef={entradaGalpaoInputRef}
        onEntradaGalpaoClick={() => entradaGalpaoInputRef.current?.click()}
        onEntradaGalpaoChange={handleAtualizarEntradaGalpao}
        atualizandoEntradaGalpao={atualizandoEntradaGalpao}
        onConfigClick={() => setConfigModalOpen(true)}
        onDeletar={handleDeletar}
      />
      {!hasData ? (
        <SLAImportSection
          token={token}
          loadingLista={loadingLista}
          hasData={hasData}
          onImportSuccess={onImportSuccess}
        />
      ) : (
        <>
          <SLAConfigModal
            open={configModalOpen}
            onClose={() => setConfigModalOpen(false)}
            allBases={allBasesForConfig}
            savedBases={savedBasesSla ?? []}
            onSave={handleSaveBasesConfigWithBases}
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

          {atualizandoEntradaGalpao && (
            <div className="sla__loading-overlay" role="status" aria-live="polite" aria-busy="true">
              <div className="sla__loading-modal">
                <div className="sla__loading-spinner" aria-hidden />
                <p className="sla__loading-title">A enviar tabela de entrada no galpão</p>
                <p className="sla__loading-desc">O ficheiro está a ser processado. Aguarde até finalizar.</p>
              </div>  
            </div>
          )}

          {cidadesFilterOpen && cidadesFilterAnchorRect && (
            <SLACidadesFilterDropdown
              anchorRect={cidadesFilterAnchorRect}
              refProp={cidadesFilterRef}
              searchTerm={cidadesFilterSearchTerm}
              onSearchChange={setCidadesFilterSearchTerm}
              cidadesOptions={cidadesOptions}
              selectedCidades={selectedCidades}
              onToggleCidade={handleToggleCidade}
              onClear={() => {
                setSelectedCidades([])
                setPage(1)
              }}
              onSelectAll={() => {
                setSelectedCidades([...cidadesOptions])
                setPage(1)
              }}
              onDeselectAll={() => {
                setSelectedCidades([])
                setPage(1)
              }}
              onPointerDownCapture={(e) => e.stopPropagation()}
            />
          )}

          <SLATableView
            tableWrapRef={tableWrapRef}
            indicadoresLoading={indicadoresLoading}
            slaTableHeader={slaTableHeader}
            bodyRowsPaginated={bodyRowsPaginated}
            start={start}
            totalMotoristas={totalMotoristas}
            totalPages={totalPages}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            onRowsPerPageChange={handleRowsPerPageChange}
            goToPage={goToPage}
            onHeaderClick={handleHeaderClick}
            activeFilterColIndices={activeFilterColIndices}
            pctColIndex={pctColIndex}
            tipoAcompanhamento={tipoAcompanhamento}
            onAcompanhamentoClick={() => setAcompanhamentoModalOpen(true)}
            cidadesFilterBtnRef={cidadesFilterBtnRef}
            cidadesFilterOpen={cidadesFilterOpen}
            onCidadesFilterClick={handleCidadesFilterClick}
            hasData={hasData}
            openFilterIndex={openFilterIndex}
            filterDropdownAnchorRect={filterDropdownAnchorRect}
            filterSearchTerm={filterSearchTerm}
            setFilterSearchTerm={setFilterSearchTerm}
            getUniqueColumnValues={getUniqueColumnValues}
            isColumnFilterValueSelected={isColumnFilterValueSelected}
            toggleColumnFilterValue={toggleColumnFilterValue}
            clearColumnFilter={clearColumnFilter}
            onCellEntreguesClick={(motoristaNome, baseNome) =>
              handleOpenNaoEntregues(motoristaNome, baseNome, 'entregues')
            }
            onCellNaoEntreguesClick={(motoristaNome, baseNome) =>
              handleOpenNaoEntregues(motoristaNome, baseNome, 'nao-entregues')
            }
            onCellEntradaGalpaoClick={(motoristaNome, baseNome) =>
              handleOpenNaoEntregues(motoristaNome, baseNome, 'entrada-galpao')
            }
          />
        </>
      )}
    </div>
  )
}
