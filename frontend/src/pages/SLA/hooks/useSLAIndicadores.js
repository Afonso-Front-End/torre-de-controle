/**
 * Hook: busca indicadores SLA (por motorista, por base, header) e sincroniza com config (bases_sla).
 */
import { useState, useCallback, useEffect } from 'react'
import { getSLAIndicadores, updateConfig } from '../../../services'
import { getTodayDateString } from './useSLATabela'
import { CONFIG_KEY_SLA_ACOMPANHAMENTO, getTipoAcompanhamentoFromConfig } from '../SLA.js'

export default function useSLAIndicadores({
  token,
  hasData,
  user,
  setUser,
  selectedDatas,
  selectedBases,
  selectedPeriodo,
  selectedCidades,
  configModalOpen,
}) {
  const [porMotorista, setPorMotorista] = useState([])
  const [porBase, setPorBase] = useState([])
  const [slaTableHeader, setSlaTableHeader] = useState([])
  const [fullPorBase, setFullPorBase] = useState([])
  const [allPorMotorista, setAllPorMotorista] = useState([])
  const [indicadoresLoading, setIndicadoresLoading] = useState(false)
  const [allBasesForConfig, setAllBasesForConfig] = useState([])
  const [loadingBasesForConfig, setLoadingBasesForConfig] = useState(false)
  const [savingBasesConfig, setSavingBasesConfig] = useState(false)
  const [tipoAcompanhamento, setTipoAcompanhamento] = useState(() => getTipoAcompanhamentoFromConfig(user))

  const fetchIndicadores = useCallback(async () => {
    if (!token || !hasData) return
    setIndicadoresLoading(true)
    try {
      const datasParam = selectedDatas.length > 0 ? selectedDatas : [getTodayDateString()]
      const basesParam = selectedBases.length > 0 ? selectedBases : null
      const periodoParam = selectedPeriodo === 'Todos' ? null : selectedPeriodo
      const cidadesParam = selectedCidades.length > 0 ? selectedCidades : null

      const res = await getSLAIndicadores(token, datasParam, basesParam, periodoParam, cidadesParam)
      setPorMotorista(res.porMotorista || [])
      setPorBase(res.porBase || [])
      setSlaTableHeader(Array.isArray(res.header) ? res.header : [])

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
    setTipoAcompanhamento(getTipoAcompanhamentoFromConfig(user))
  }, [user?.config?.[CONFIG_KEY_SLA_ACOMPANHAMENTO]])

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
      } finally {
        setSavingBasesConfig(false)
      }
    },
    [token, user, setUser]
  )

  return {
    porMotorista,
    setPorMotorista,
    porBase,
    slaTableHeader,
    fullPorBase,
    allPorMotorista,
    indicadoresLoading,
    fetchIndicadores,
    allBasesForConfig,
    loadingBasesForConfig,
    savingBasesConfig,
    handleSaveBasesConfig,
    tipoAcompanhamento,
    setTipoAcompanhamento,
  }
}
