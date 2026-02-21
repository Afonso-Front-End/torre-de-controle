import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MdOutlineDelete, MdClose, MdUpload, MdSettings, MdSpaceDashboard, MdEdit, MdCheck, MdMessage, MdDownload, MdContentCopy } from 'react-icons/md'
import { CiFilter } from 'react-icons/ci'
import { useAppContext, useNotification } from '../../../context'
import { transition, overlayVariants, modalContentVariants } from '../../../utils/animations'
import { getResultadosConsultaMotoristaDatas, getResultadosConsultaMotorista, updateResultadosConsultaMotorista, deleteResultadosConsultaMotorista, updateConfig, getContatoListaTelefones, updateContatoListaTelefones, upsertContatoListaTelefones } from '../../../services'
import { getResultadosCache, setResultadosCache, invalidateResultadosCache } from '../../../utils/resultadosCache'
import {
  VALID_ROWS_PER_PAGE,
  CORREIO_KEY,
  SELECTED_ENTREGADOR_STORAGE_KEY,
  MODAL_FILTER_STORAGE_KEY,
  MODAL_FILTER_ENTREGUES,
  MODAL_FILTER_NAO_ENTREGUES,
  RESULTADOS_DATAS_STORAGE_KEY,
  BASE_KEY,
  DIAS_SEM_MOVIMENTACAO_KEY,
  MARCA_KEY,
  NUMERO_JMS_KEY,
  PER_PAGE_FETCH,
  getTodayLocal,
  isEntregue,
  isNaoEntregue,
  MOTORISTA_COLUMNS,
  groupByCorreioAndBase,
  groupedToTable,
} from './ResultadosConsulta.js'
import Loader from '../../../components/Loader'
import { Logo } from '../../../components/Logo'
import DateFilterSelect from '../../../components/DateFilterSelect'
import DataTable from '../VerificarPedidos/DataTable'
import { CHUNK_SIZE } from '../VerificarPedidos/VerificarPedidosParados.js'
import * as XLSX from 'xlsx'
import './ResultadosConsulta.css'

/** Barra de evolução: só aparece quando há pedidos assinados (entregues); valores X/Y sempre visíveis. */
function EvolucaoBar({ entregues = 0, naoEntregues = 0 }) {
  const totalClassificados = entregues + naoEntregues
  const pctEntregues = totalClassificados > 0 ? (entregues / totalClassificados) * 100 : 0
  const mostraBarra = entregues > 0
  return (
    <div className="resultados-consulta__evolucao-bar" title={`${entregues} entregues / ${naoEntregues} não entregues`}>
      {mostraBarra && (
        <div className="resultados-consulta__evolucao-bar-track">
          <div
            className="resultados-consulta__evolucao-bar-fill"
            style={{ width: `${pctEntregues}%` }}
            aria-hidden
          />
        </div>
      )}
      <span className="resultados-consulta__evolucao-label">
        {entregues} / {naoEntregues}
      </span>
    </div>
  )
}

/* --- Helpers para telefone e mensagem (mesma lógica do modal SLA não entregues) --- */
function getSaudacao() {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}
const PLACEHOLDER_ENTREGADOR = '(Nome do entregador)'
const PLACEHOLDER_TOTAL = '(Total de pedidos)'
const PLACEHOLDER_USUARIO = '(Nome do usuário)'
const PLACEHOLDERS_SAUDACAO = ['(Bom dia)', '(Boa tarde)', '(Boa noite)']
function getPlaceholderSaudacao() {
  const s = getSaudacao()
  if (s === 'Bom dia') return '(Bom dia)'
  if (s === 'Boa tarde') return '(Boa tarde)'
  return '(Boa noite)'
}
function mensagemMantemPlaceholders(texto, placeholderSaudacao) {
  const t = String(texto ?? '')
  if (!t.includes(PLACEHOLDER_ENTREGADOR)) return false
  if (!t.includes(placeholderSaudacao)) return false
  if (!t.includes(PLACEHOLDER_TOTAL)) return false
  if (!t.includes(PLACEHOLDER_USUARIO)) return false
  return true
}
function getMensagemTemplate(total, placeholderSaudacao) {
  return `Olá ${PLACEHOLDER_ENTREGADOR}, ${placeholderSaudacao} meu nome é ${PLACEHOLDER_USUARIO} e sou da torre de controle J&T express. Pedidos sem movimentação constam em aberto ${PLACEHOLDER_TOTAL} pedido${total !== 1 ? 's' : ''}. Aguardo seu retorno. Atenciosamente: ${PLACEHOLDER_USUARIO}`
}
function getMensagemApenasPlaceholders(placeholderSaudacao) {
  return `${PLACEHOLDER_ENTREGADOR}, ${placeholderSaudacao}, ${PLACEHOLDER_USUARIO}, ${PLACEHOLDER_TOTAL}, ${PLACEHOLDER_USUARIO}`
}
function substituirPlaceholders(texto, entregador, saudacaoReal, total, nomeUsuario) {
  let out = String(texto ?? '')
  out = out.split(PLACEHOLDER_ENTREGADOR).join(entregador)
  out = out.split(PLACEHOLDER_TOTAL).join(String(total))
  out = out.split(PLACEHOLDER_USUARIO).join(nomeUsuario)
  PLACEHOLDERS_SAUDACAO.forEach((ph) => { out = out.split(ph).join(saudacaoReal) })
  return out
}
const TODOS_PLACEHOLDERS_RC = [PLACEHOLDER_ENTREGADOR, PLACEHOLDER_TOTAL, PLACEHOLDER_USUARIO, ...PLACEHOLDERS_SAUDACAO]
function getSegmentosMensagem(texto) {
  const t = String(texto ?? '')
  const segmentos = []
  let restante = t
  while (restante.length > 0) {
    let menorIdx = -1
    let qual = ''
    for (const ph of TODOS_PLACEHOLDERS_RC) {
      const i = restante.indexOf(ph)
      if (i !== -1 && (menorIdx === -1 || i < menorIdx)) { menorIdx = i; qual = ph }
    }
    if (menorIdx === -1) {
      if (restante) segmentos.push({ type: 'text', value: restante })
      break
    }
    if (menorIdx > 0) segmentos.push({ type: 'text', value: restante.slice(0, menorIdx) })
    segmentos.push({ type: 'placeholder', value: qual })
    restante = restante.slice(menorIdx + qual.length)
  }
  return segmentos
}
function formatarTelefoneComNove(val) {
  const digits = String(val ?? '').replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('1') === false) return digits.slice(0, 2) + '9' + digits.slice(2)
  return digits
}
function telefoneParaWhatsApp(val) {
  const digits = formatarTelefoneComNove(val)
  if (digits.length < 10) return ''
  return '55' + digits
}

export default function ResultadosConsulta() {
  const { user, setUser, refetchUser, setGlobalLoading } = useAppContext()
  const { showNotification } = useNotification()
  const location = useLocation()
  const navigate = useNavigate()
  const token = user?.token

  const initialRowsPerPage = VALID_ROWS_PER_PAGE.includes(Number(user?.config?.linhas_por_pagina))
    ? Number(user?.config?.linhas_por_pagina)
    : 100

  /** Sem pré-seleção: sem datas = busca todos. Com datas = filtra por data. Inicial de localStorage. */
  const [selectedDatas, setSelectedDatas] = useState(() => {
    try {
      const raw = localStorage.getItem(RESULTADOS_DATAS_STORAGE_KEY)
      if (!raw) return []
      const arr = JSON.parse(raw)
      if (!Array.isArray(arr)) return []
      return arr.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    } catch {
      return []
    }
  })
  const datasParam = selectedDatas.length > 0 ? selectedDatas : null
  /** Quando marcado, inclui na listagem os não entregues de outras datas (além das datas selecionadas). Persistido em user.config.incluir_nao_entregues_outras_datas. Com esta opção marcada, a tabela renderiza sempre com a data de hoje e o backend devolve: dados de hoje + apenas não entregues das outras datas. */
  const [incluirNaoEntreguesOutrasDatas, setIncluirNaoEntreguesOutrasDatas] = useState(() => !!user?.config?.incluir_nao_entregues_outras_datas)
  /** Com "incluir não entregues outras datas" marcado: usa as datas selecionadas (ex.: ontem → puxa tudo de ontem + não entregues das outras); se não houver datas selecionadas, usa a data de hoje. */
  const effectiveDatasParam = useMemo(
    () => (incluirNaoEntreguesOutrasDatas ? (datasParam || [getTodayLocal()]) : datasParam),
    [incluirNaoEntreguesOutrasDatas, datasParam]
  )
  const { cachedResultadosKey, cachedResultadosData, cachedResultadosTotal } = getResultadosCache()
  const hasResultadosCache = token && cachedResultadosKey === token && !datasParam && !incluirNaoEntreguesOutrasDatas
  const [loading, setLoading] = useState(!hasResultadosCache)
  /** Lista completa de documentos motorista (para agrupar no front e para o modal). */
  const [data, setData] = useState(() => (hasResultadosCache ? cachedResultadosData : []))
  const [total, setTotal] = useState(() => (hasResultadosCache ? cachedResultadosTotal : 0))
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage)
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [copyDropdownOpen, setCopyDropdownOpen] = useState(false)
  const copyDropdownRef = useRef(null)
  const [showConfirmExcluir, setShowConfirmExcluir] = useState(false)
  const [showConfirmDesativarIncluir, setShowConfirmDesativarIncluir] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  /** Seleção no modal de config: dias sem movimentação e bases (antes de guardar). */
  const [configDiasSelection, setConfigDiasSelection] = useState([])
  const [configBasesSelection, setConfigBasesSelection] = useState([])
  const [savingConfigFiltros, setSavingConfigFiltros] = useState(false)
  const fileInputRef = useRef(null)
  const [searchCorreio, setSearchCorreio] = useState('')
  const [columnFilters, setColumnFilters] = useState({})
  const [openFilterIndex, setOpenFilterIndex] = useState(null)
  const [filterDropdownAnchorRect, setFilterDropdownAnchorRect] = useState(null)
  const [filterSearchTerm, setFilterSearchTerm] = useState('')
  const [filterLoading, setFilterLoading] = useState(false)
  const filterDropdownRef = useRef(null)
  const filterLoadingTimeoutRef = useRef(null)
  const hasRestoredSelectionRef = useRef(false)
  /** Modal entregador: { correio, base } quando aberto, null quando fechado */
  const [modalEntregador, setModalEntregador] = useState(null)
  /** Enquanto preenchido, mostra o modal só com loading (sem calcular a tabela), para não travar no clique. */
  const [modalPending, setModalPending] = useState(null)
  /** Loading do conteúdo do modal: mostrar spinner até o conteúdo estar pronto. */
  const [modalContentReady, setModalContentReady] = useState(false)
  /** Último entregador clicado (para marcar a linha ao fechar e após recarregar – não abre o modal) */
  const [lastSelectedEntregador, setLastSelectedEntregador] = useState(null)
  /** Filtro do modal: 'entregues' | 'naoEntregues'; inicial de localStorage */
  const modalSelectAllRef = useRef(null)

  const [modalFilter, setModalFilter] = useState(() => {
    try {
      const v = localStorage.getItem(MODAL_FILTER_STORAGE_KEY)
      return v === MODAL_FILTER_NAO_ENTREGUES ? MODAL_FILTER_NAO_ENTREGUES : MODAL_FILTER_ENTREGUES
    } catch {
      return MODAL_FILTER_ENTREGUES
    }
  })
  /** Telefone e mensagem no modal do entregador (mesma lógica do modal SLA não entregues) */
  const [modalTelefone, setModalTelefone] = useState('')
  const [modalContatoDocId, setModalContatoDocId] = useState(null)
  const [modalPhoneEditing, setModalPhoneEditing] = useState(false)
  const [modalSavingContato, setModalSavingContato] = useState(false)
  const [mensagemModalOpen, setMensagemModalOpen] = useState(false)
  const [mensagemTexto, setMensagemTexto] = useState('')
  const [savingMensagem, setSavingMensagem] = useState(false)
  const [mensagemEditKey, setMensagemEditKey] = useState(0)
  const mensagemPlaceholderSaudacaoRef = useRef('(Boa tarde)')
  const mensagemTextoRef = useRef(mensagemTexto)
  mensagemTextoRef.current = mensagemTexto
  const mensagemEditRef = useRef(null)
  const mensagemSalva = user?.config?.mensagem_resultados_consulta

  /** Colunas que o botão "Copiar" usa (config do utilizador); por defeito todas. */
  const colunasCopiaConfig = user?.config?.colunas_copia_resultados_consulta
  const columnsToCopy = useMemo(() => {
    if (Array.isArray(colunasCopiaConfig) && colunasCopiaConfig.length > 0) {
      const set = new Set(MOTORISTA_COLUMNS)
      const valid = colunasCopiaConfig.filter((c) => set.has(c))
      if (valid.length > 0) return valid
    }
    return [...MOTORISTA_COLUMNS]
  }, [colunasCopiaConfig])

  const [modalConfigColunasOpen, setModalConfigColunasOpen] = useState(false)
  const [modalConfigColunasSelection, setModalConfigColunasSelection] = useState(() => [...MOTORISTA_COLUMNS])
  const [savingConfigColunas, setSavingConfigColunas] = useState(false)

  const openModalConfigColunas = useCallback(() => {
    setModalConfigColunasSelection(columnsToCopy.length ? [...columnsToCopy] : [...MOTORISTA_COLUMNS])
    setModalConfigColunasOpen(true)
  }, [columnsToCopy])

  const handleSaveConfigColunas = useCallback(async () => {
    if (!token) return
    setSavingConfigColunas(true)
    try {
      await updateConfig(token, { colunas_copia_resultados_consulta: modalConfigColunasSelection })
      await refetchUser()
      setModalConfigColunasOpen(false)
      showNotification('Colunas para cópia guardadas.', 'success')
    } catch (err) {
      showNotification(err?.message ?? 'Não foi possível guardar.', 'error')
    } finally {
      setSavingConfigColunas(false)
    }
  }, [token, modalConfigColunasSelection, refetchUser, showNotification])

  const toggleModalConfigColuna = useCallback((col) => {
    setModalConfigColunasSelection((prev) => {
      const next = prev.filter((c) => c !== col)
      if (next.length === prev.length) return [...prev, col]
      return next
    })
  }, [])

  /* Fase 1: modalPending definido → primeiro paint é leve (só modal + loader). Depois carregamos o payload. */
  useEffect(() => {
    if (!modalPending) return
    const t = setTimeout(() => {
      setModalEntregador(modalPending)
      setModalPending(null)
    }, 0)
    return () => clearTimeout(t)
  }, [modalPending])

  /* Fase 2: modalEntregador definido → loading até dados prontos + 1 s, depois mostramos a tabela. */
  const MIN_LOADING_MS = 1000
  useEffect(() => {
    if (!modalEntregador) {
      setModalContentReady(false)
      return
    }
    setModalContentReady(false)
    let rafId = null
    let timeoutId = null
    rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        timeoutId = setTimeout(() => {
          setModalContentReady(true)
        }, MIN_LOADING_MS)
      })
    })
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
      if (timeoutId != null) clearTimeout(timeoutId)
    }
  }, [modalEntregador])

  const handleDatasChange = useCallback((newDatas) => {
    setSelectedDatas(newDatas)
    try {
      localStorage.setItem(RESULTADOS_DATAS_STORAGE_KEY, JSON.stringify(newDatas))
    } catch { }
  }, [])

  const setModalFilterAndSave = useCallback((value) => {
    setModalFilter(value)
    try {
      localStorage.setItem(MODAL_FILTER_STORAGE_KEY, value)
    } catch { }
  }, [])

  const closeModal = useCallback(() => {
    setModalEntregador(null)
    setModalPending(null)
    setModalSelectedIndices(new Set())
    setModalTelefone('')
    setModalContatoDocId(null)
    setModalPhoneEditing(false)
    setMensagemModalOpen(false)
    setModalConfigColunasOpen(false)
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur()
    }
  }, [])

  const modalAberto = Boolean(modalPending || modalEntregador)
  const modalEntregadorOuPending = modalEntregador || modalPending
  const modalCorreio = modalEntregadorOuPending?.correio ?? ''
  const modalBase = modalEntregadorOuPending?.base ?? ''
  const nomeUsuario = user?.nome ?? ''
  const saudacao = useMemo(() => getSaudacao(), [])

  const fetchModalContato = useCallback(async () => {
    if (!token || !modalCorreio?.trim()) return
    try {
      const res = await getContatoListaTelefones(token, modalCorreio.trim(), (modalBase || '(sem base)').trim())
      setModalTelefone(res.contato ?? '')
      setModalContatoDocId(res._id ?? null)
    } catch {
      setModalTelefone('')
      setModalContatoDocId(null)
    }
  }, [token, modalCorreio, modalBase])

  const handleModalSaveContato = useCallback(async () => {
    if (!token || !modalCorreio?.trim()) return
    const formatted = formatarTelefoneComNove(modalTelefone)
    const baseVal = (modalBase || '(sem base)').trim()
    setModalSavingContato(true)
    try {
      if (modalContatoDocId) {
        await updateContatoListaTelefones(token, modalContatoDocId, formatted)
        setModalTelefone(formatted)
        setModalPhoneEditing(false)
        showNotification('Telefone atualizado.', 'success')
      } else {
        await upsertContatoListaTelefones(token, modalCorreio.trim(), baseVal, formatted)
        setModalTelefone(formatted)
        setModalPhoneEditing(false)
        const res = await getContatoListaTelefones(token, modalCorreio.trim(), baseVal)
        setModalContatoDocId(res._id ?? null)
        showNotification('Telefone guardado na lista de telefones.', 'success')
      }
    } catch (err) {
      showNotification(err.message || 'Não foi possível guardar o telefone.', 'error')
    } finally {
      setModalSavingContato(false)
    }
  }, [token, modalContatoDocId, modalCorreio, modalBase, modalTelefone, showNotification])

  const handleModalOpenWhatsApp = useCallback(() => {
    const num = telefoneParaWhatsApp(modalTelefone)
    if (!num) {
      showNotification('Informe o número de telefone para abrir o WhatsApp.', 'error')
      return
    }
    window.open(`https://wa.me/${num}`, '_blank', 'noopener,noreferrer')
  }, [modalTelefone, showNotification])

  const handleMensagemTextoChange = useCallback(() => {
    const el = mensagemEditRef.current
    if (!el) return
    const next = el.innerText
    if (mensagemMantemPlaceholders(next, mensagemPlaceholderSaudacaoRef.current)) return
    const apenasPlaceholders = getMensagemApenasPlaceholders(mensagemPlaceholderSaudacaoRef.current)
    setMensagemTexto(apenasPlaceholders)
    setMensagemEditKey((k) => k + 1)
    showNotification('Visível apenas o que não pode ser excluído (os campos entre parênteses).', 'info')
  }, [showNotification])

  const handleMensagemPaste = useCallback((e) => {
    e.preventDefault()
    const text = e.clipboardData?.getData('text/plain') ?? ''
    document.execCommand('insertText', false, text)
  }, [])

  const handleGuardarMensagem = useCallback(async () => {
    const el = mensagemEditRef.current
    if (!el || !token) return
    const text = el.innerText?.trim() ?? ''
    if (!mensagemMantemPlaceholders(text, mensagemPlaceholderSaudacaoRef.current)) {
      showNotification('A mensagem deve conter todos os campos entre parênteses para poder guardar.', 'error')
      return
    }
    setSavingMensagem(true)
    try {
      await updateConfig(token, { mensagem_resultados_consulta: text })
      await refetchUser()
      mensagemTextoRef.current = text
      setMensagemTexto(text)
      showNotification('Mensagem guardada no servidor.', 'success')
    } catch (err) {
      showNotification(err?.message ?? 'Não foi possível guardar a mensagem.', 'error')
    } finally {
      setSavingMensagem(false)
    }
  }, [token, refetchUser, showNotification])

  useEffect(() => {
    if (modalEntregador && token && modalCorreio?.trim()) fetchModalContato()
  }, [modalEntregador, token, modalCorreio, fetchModalContato])

  useEffect(() => {
    if (!modalAberto) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalAberto, closeModal])

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setGlobalLoading(true, 'A carregar…')
    try {
      const all = []
      let pageNum = 1
      let totalCount = 0
      do {
        const res = await getResultadosConsultaMotorista(
          token,
          pageNum,
          PER_PAGE_FETCH,
          effectiveDatasParam,
          incluirNaoEntreguesOutrasDatas
        )
        const chunk = res.data || []
        totalCount = res.total ?? 0
        all.push(...chunk)
        if (all.length >= totalCount || chunk.length < PER_PAGE_FETCH) break
        pageNum += 1
      } while (true)
      setData(all)
      setTotal(totalCount)
      if (!effectiveDatasParam && !incluirNaoEntreguesOutrasDatas) setResultadosCache(token, all, totalCount)
    } catch (err) {
      showNotification(err.message || 'Erro ao carregar resultados.', 'error')
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
      setGlobalLoading(false)
    }
  }, [token, effectiveDatasParam, incluirNaoEntreguesOutrasDatas, showNotification, setGlobalLoading])

  /* Sincroniza estado do checkbox com user.config ao carregar/hidratar user (ex.: após login ou refetch). */
  useEffect(() => {
    if (user?.config && 'incluir_nao_entregues_outras_datas' in user.config) {
      setIncluirNaoEntreguesOutrasDatas(!!user.config.incluir_nao_entregues_outras_datas)
    }
  }, [user?.config?.incluir_nao_entregues_outras_datas])

  /* Reavalia cache / refetch ao montar, ao navegar, ao mudar filtro de datas ou ao marcar "incluir não entregues outras datas". */
  useEffect(() => {
    if (!token || location.pathname !== '/resultados-consulta') return
    setPage(1)
    if (effectiveDatasParam || incluirNaoEntreguesOutrasDatas) {
      fetchData()
      return
    }
    const cache = getResultadosCache()
    if (cache.cachedResultadosKey === token) {
      setData(cache.cachedResultadosData)
      setTotal(cache.cachedResultadosTotal)
      setLoading(false)
      return
    }
    fetchData()
  }, [token, fetchData, location.pathname, effectiveDatasParam, incluirNaoEntreguesOutrasDatas])

  const handleClearMotorista = useCallback(async () => {
    if (!token) {
      showNotification('Sessão expirada. Faça login novamente.', 'error')
      return
    }
    setDeleting(true)
    try {
      const res = await deleteResultadosConsultaMotorista(token)
      showNotification(`${res.deleted ?? 0} registro(s) removido(s) da coleção motorista.`, 'success')
      invalidateResultadosCache()
      setPage(1)
      setData([])
      setTotal(0)
      fetchData()
      refetchUser?.()
    } catch (err) {
      showNotification(err.message || 'Erro ao limpar.', 'error')
    } finally {
      setDeleting(false)
    }
  }, [token, showNotification, fetchData, refetchUser])

  const handleConfirmarExcluir = useCallback(() => {
    setShowConfirmExcluir(false)
    handleClearMotorista()
  }, [handleClearMotorista])

  const handleConfirmarDesativarIncluir = useCallback(async () => {
    setShowConfirmDesativarIncluir(false)
    setIncluirNaoEntreguesOutrasDatas(false)
    if (!token) return
    try {
      const data = await updateConfig(token, { incluir_nao_entregues_outras_datas: false })
      setUser({ ...user, config: data?.config ?? { ...user?.config, incluir_nao_entregues_outras_datas: false } })
    } catch (err) {
      showNotification(err.message || 'Erro ao salvar preferência.', 'error')
    }
  }, [token, user, setUser, showNotification])

  const handleAtualizarClick = useCallback(() => {
    if (!token) {
      showNotification('Sessão expirada. Faça login novamente.', 'error')
      return
    }
    fileInputRef.current?.click()
  }, [token, showNotification])

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      if (updating) return
      if (!token) {
        showNotification('Sessão expirada. Faça login novamente.', 'error')
        return
      }
      const ext = (file.name || '').toLowerCase()
      if (!ext.endsWith('.xlsx')) {
        showNotification('Envie um arquivo .xlsx', 'error')
        return
      }
      setUpdating(true)
      try {
        const res = await updateResultadosConsultaMotorista(token, file)
        showNotification(`${res.updated ?? 0} registro(s) atualizado(s) na coleção motorista.`, 'success')
        setPage(1)
        invalidateResultadosCache()
        fetchData()
        refetchUser?.()
      } catch (err) {
        showNotification(err.message || 'Erro ao atualizar.', 'error')
      } finally {
        setUpdating(false)
      }
    },
    [token, showNotification, fetchData, refetchUser, updating]
  )

  useEffect(() => {
    if (!copyDropdownOpen) return
    const onPointerDown = (e) => {
      if (copyDropdownRef.current && !copyDropdownRef.current.contains(e.target)) {
        setCopyDropdownOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [copyDropdownOpen])

  const handleCopyChunk = useCallback(
    (chunk) => {
      const text = chunk.join('\n')
      navigator.clipboard.writeText(text).then(
        () => showNotification(`${chunk.length} número(s) JMS copiado(s).`, 'success'),
        () => showNotification('Falha ao copiar.', 'error')
      )
    },
    [showNotification]
  )

  /** Filtros da tabela principal (guardados no user config): bases e dias sem movimentação. */
  const basesConfig = user?.config?.bases_resultados_consulta
  const diasSemMovimentacaoConfig = user?.config?.dias_sem_movimentacao_resultados_consulta
  const dataFiltered = useMemo(() => {
    let list = data
    if (Array.isArray(basesConfig) && basesConfig.length > 0) {
      const baseSet = new Set(basesConfig.map((b) => String(b).trim()).filter(Boolean))
      if (baseSet.size > 0) {
        list = list.filter((doc) => baseSet.has(String(doc[BASE_KEY] ?? '').trim()))
      }
    }
    if (Array.isArray(diasSemMovimentacaoConfig) && diasSemMovimentacaoConfig.length > 0) {
      const diasSet = new Set(diasSemMovimentacaoConfig.map((d) => String(d).trim()).filter((s) => s !== undefined && s !== null))
      if (diasSet.size > 0) {
        list = list.filter((doc) => diasSet.has(String(doc[DIAS_SEM_MOVIMENTACAO_KEY] ?? '').trim()))
      }
    }
    return list
  }, [data, basesConfig, diasSemMovimentacaoConfig])

  /** Números JMS apenas dos registos com Marca = "Não entregue" (respeitando filtros de bases/dias). */
  const numerosNaoEntregues = useMemo(() => {
    if (!Array.isArray(dataFiltered) || dataFiltered.length === 0) return []
    return dataFiltered
      .filter((doc) => isNaoEntregue(doc[MARCA_KEY]))
      .map((doc) => doc[NUMERO_JMS_KEY])
      .filter((v) => v != null && String(v).trim() !== '')
  }, [dataFiltered])

  const numerosChunks = useMemo(() => {
    if (numerosNaoEntregues.length === 0) return []
    const list = []
    for (let i = 0; i < numerosNaoEntregues.length; i += CHUNK_SIZE) {
      list.push(numerosNaoEntregues.slice(i, i + CHUNK_SIZE))
    }
    return list
  }, [numerosNaoEntregues])

  /** Valores únicos (a partir dos dados completos) para os selects do modal de config. */
  const uniqueDiasSemMovimentacao = useMemo(() => {
    const set = new Set()
    data.forEach((doc) => {
      const v = doc[DIAS_SEM_MOVIMENTACAO_KEY]
      const s = v !== undefined && v !== null ? String(v).trim() : ''
      if (s !== '') set.add(s)
    })
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }))
  }, [data])

  const uniqueBases = useMemo(() => {
    const set = new Set()
    data.forEach((doc) => {
      const s = String(doc[BASE_KEY] ?? '').trim()
      if (s) set.add(s)
    })
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [data])

  useEffect(() => {
    if (showConfigModal) {
      setConfigDiasSelection(Array.isArray(user?.config?.dias_sem_movimentacao_resultados_consulta) ? [...user.config.dias_sem_movimentacao_resultados_consulta] : [])
      setConfigBasesSelection(Array.isArray(user?.config?.bases_resultados_consulta) ? [...user.config.bases_resultados_consulta] : [])
    }
  }, [showConfigModal, user?.config?.dias_sem_movimentacao_resultados_consulta, user?.config?.bases_resultados_consulta])

  const handleSaveConfigFiltros = useCallback(async () => {
    if (!token) return
    setSavingConfigFiltros(true)
    try {
      await updateConfig(token, {
        dias_sem_movimentacao_resultados_consulta: configDiasSelection,
        bases_resultados_consulta: configBasesSelection,
      })
      await refetchUser()
      setShowConfigModal(false)
      showNotification('Filtros guardados. A tabela foi atualizada.', 'success')
    } catch (err) {
      showNotification(err?.message ?? 'Não foi possível guardar.', 'error')
    } finally {
      setSavingConfigFiltros(false)
    }
  }, [token, configDiasSelection, configBasesSelection, refetchUser, showNotification])

  const toggleConfigDias = useCallback((value) => {
    setConfigDiasSelection((prev) => {
      const next = prev.filter((v) => v !== value)
      if (next.length === prev.length) return [...prev, value]
      return next
    })
  }, [])

  const toggleConfigBase = useCallback((value) => {
    setConfigBasesSelection((prev) => {
      const next = prev.filter((v) => v !== value)
      if (next.length === prev.length) return [...prev, value]
      return next
    })
  }, [])

  const grouped = useMemo(() => groupByCorreioAndBase(dataFiltered), [dataFiltered])

  /** Agrupa com Evolução: para cada entregador conta entregues vs não entregues pela "Marca de assinatura". */
  const groupedWithEvolucao = useMemo(() => {
    return grouped.map((row) => {
      const correio = String(row[CORREIO_KEY] ?? '').trim()
      const base = String(row[BASE_KEY] ?? '').trim()
      const pedidos = dataFiltered.filter(
        (doc) =>
          String(doc[CORREIO_KEY] ?? '').trim() === correio &&
          String(doc[BASE_KEY] ?? '').trim() === base
      )
      let entregues = 0
      let naoEntregues = 0
      for (const doc of pedidos) {
        const marca = doc[MARCA_KEY]
        if (isEntregue(marca)) entregues += 1
        else if (isNaoEntregue(marca)) naoEntregues += 1
      }
      const evolucaoDisplay = `${entregues} entregues / ${naoEntregues} não entregues`
      return { ...row, entregues, naoEntregues, evolucaoDisplay }
    })
  }, [grouped, dataFiltered])

  const getUniqueColumnValues = useCallback(
    (colIndex) => {
      if (colIndex === 0)
        return Array.from({ length: groupedWithEvolucao.length }, (_, i) => String(i + 1))
      const idx = colIndex - 1
      const seen = new Set()
      groupedWithEvolucao.forEach((row) => {
        const v =
          idx === 0
            ? row[CORREIO_KEY]
            : idx === 1
              ? row[BASE_KEY]
              : idx === 2
                ? String(row.total ?? '')
                : row.evolucaoDisplay ?? ''
        const s = String(v ?? '').trim()
        if (s) seen.add(s)
      })
      return [...seen].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    },
    [groupedWithEvolucao]
  )

  const filteredGrouped = useMemo(() => {
    let list = groupedWithEvolucao
    const search = searchCorreio.trim().toLowerCase()
    if (search) {
      list = list.filter((row) => String(row[CORREIO_KEY] ?? '').toLowerCase().includes(search))
    }
    const colIndexes = Object.keys(columnFilters).map(Number)
    list = list.filter((row, rowIndex) => {
      for (const colIndex of colIndexes) {
        const selected = columnFilters[colIndex]
        if (!Array.isArray(selected) || selected.length === 0) continue
        const set = new Set(selected.map((s) => String(s).trim().toLowerCase()).filter(Boolean))
        if (set.size === 0) continue
        const raw =
          colIndex === 0
            ? String(rowIndex + 1)
            : colIndex === 1
              ? String(row[CORREIO_KEY] ?? '').trim()
              : colIndex === 2
                ? String(row[BASE_KEY] ?? '').trim()
                : colIndex === 3
                  ? String(row.total ?? '').trim()
                  : String(row.evolucaoDisplay ?? '').trim()
        const cell = colIndex === 0 ? raw : raw.toLowerCase()
        if (!set.has(cell)) return false
      }
      return true
    })
    return list
  }, [groupedWithEvolucao, searchCorreio, columnFilters])

  /* Restaurar apenas a marca da linha (onde estava clicado) – não abre o modal */
  useEffect(() => {
    if (loading || data.length === 0 || hasRestoredSelectionRef.current) return
    hasRestoredSelectionRef.current = true
    try {
      const raw = localStorage.getItem(SELECTED_ENTREGADOR_STORAGE_KEY)
      if (!raw) return
      const { correio, base } = JSON.parse(raw)
      if (correio == null || base == null) return
      const idx = filteredGrouped.findIndex(
        (r) =>
          String(r[CORREIO_KEY] ?? '').trim() === String(correio ?? '').trim() &&
          String(r[BASE_KEY] ?? '').trim() === String(base ?? '').trim()
      )
      if (idx >= 0) {
        setLastSelectedEntregador({ correio: String(correio).trim(), base: String(base).trim() })
        setPage(Math.floor(idx / rowsPerPage) + 1)
      }
    } catch (_) {
      /* ignorar JSON inválido */
    }
  }, [loading, data.length, filteredGrouped, rowsPerPage])

  const totalGrouped = filteredGrouped.length
  const totalPages = Math.max(1, Math.ceil(totalGrouped / rowsPerPage))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * rowsPerPage
  const groupedPage = useMemo(
    () => filteredGrouped.slice(start, start + rowsPerPage),
    [filteredGrouped, start, rowsPerPage]
  )
  const tableData = useMemo(() => groupedToTable(groupedPage), [groupedPage])
  const bodyRows = useMemo(
    () =>
      tableData.bodyRows.map((row, i) => {
        const rowData = groupedPage[i]
        const evolucaoCell =
          rowData != null ? (
            <EvolucaoBar
              key={row._id}
              entregues={rowData.entregues}
              naoEntregues={rowData.naoEntregues}
            />
          ) : (
            row.values[3]
          )
        return {
          ...row,
          values: [row.values[0], row.values[1], row.values[2], evolucaoCell],
        }
      }),
    [tableData.bodyRows, groupedPage]
  )
  const { headerValues, maxCols } = tableData
  const headerValuesWithTotalBadge = useMemo(() => {
    const idxTotal = headerValues.indexOf('Total')
    if (idxTotal === -1) return headerValues
    return headerValues.map((val, i) =>
      i === idxTotal ? (
        <span key={i} className="resultados-consulta__th-total-wrap">
          Total
          <span className="resultados-consulta__th-total-badge" aria-label={`Total: ${total} pedidos`}>
            {total}
          </span>
        </span>
      ) : (
        val
      )
    )
  }, [headerValues, total])

  /* Marcar a linha: quando o modal está aberto OU a última linha clicada (incl. após recarregar) */
  const selectedRowId = useMemo(() => {
    const entregador = modalEntregador ?? modalPending ?? lastSelectedEntregador
    if (!entregador) return null
    const { correio, base } = entregador
    const idx = groupedPage.findIndex(
      (r) =>
        String(r[CORREIO_KEY] ?? '').trim() === correio &&
        String(r[BASE_KEY] ?? '').trim() === base
    )
    return idx >= 0 ? `row-${idx}` : null
  }, [modalEntregador, modalPending, lastSelectedEntregador, groupedPage])

  const activeFilterColIndices = useMemo(() => {
    const indices = []
    for (let i = 0; i <= 4; i++) {
      if ((Array.isArray(columnFilters[i]) ? columnFilters[i].length : 0) > 0) indices.push(i)
    }
    return indices
  }, [columnFilters])

  /* Fechar dropdown de filtro por coluna ao clicar fora (tabela ou dropdown). */
  useEffect(() => {
    if (openFilterIndex === null) return
    function handleClickOutside(e) {
      if (filterDropdownRef.current?.contains(e.target)) return
      if (e.target.closest('.resultados-consulta__filter-dropdown')) return
      setOpenFilterIndex(null)
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [openFilterIndex])

  useEffect(() => {
    if (openFilterIndex === null) {
      setFilterDropdownAnchorRect(null)
      if (filterLoadingTimeoutRef.current) {
        clearTimeout(filterLoadingTimeoutRef.current)
        filterLoadingTimeoutRef.current = null
      }
    }
  }, [openFilterIndex])

  function toggleColumnFilterValue(colIndex, value) {
    setColumnFilters((prev) => {
      const arr = Array.isArray(prev[colIndex]) ? [...prev[colIndex]] : []
      const s = String(value).trim()
      const i = arr.indexOf(s)
      if (i >= 0) arr.splice(i, 1)
      else arr.push(s)
      const next = { ...prev, [colIndex]: arr }
      if (arr.length === 0) delete next[colIndex]
      return next
    })
  }

  function clearColumnFilter(colIndex) {
    setColumnFilters((prev) => {
      const next = { ...prev }
      delete next[colIndex]
      return next
    })
    setOpenFilterIndex(null)
  }

  function isColumnFilterValueSelected(colIndex, value) {
    const arr = columnFilters[colIndex]
    if (!Array.isArray(arr)) return false
    return arr.includes(String(value).trim())
  }

  function handleHeaderClick(filterColIndex, event) {
    const rect = event.target.getBoundingClientRect()
    if (openFilterIndex === filterColIndex) {
      setOpenFilterIndex(null)
      if (filterLoadingTimeoutRef.current) {
        clearTimeout(filterLoadingTimeoutRef.current)
        filterLoadingTimeoutRef.current = null
      }
      setFilterLoading(false)
      return
    }
    if (filterLoadingTimeoutRef.current) {
      clearTimeout(filterLoadingTimeoutRef.current)
      filterLoadingTimeoutRef.current = null
    }
    setFilterSearchTerm('')
    setFilterLoading(true)
    setFilterDropdownAnchorRect({ top: rect.bottom, left: rect.left, width: rect.width, height: rect.height })
    setOpenFilterIndex(filterColIndex)
    filterLoadingTimeoutRef.current = setTimeout(() => {
      setFilterLoading(false)
      filterLoadingTimeoutRef.current = null
    }, 150)
  }

  function toggleFilterValue(colIndex, value) {
    toggleColumnFilterValue(colIndex, value)
  }

  useEffect(() => {
    setPage(1)
  }, [searchCorreio, columnFilters])

  const handleCellClick = useCallback(
    (row, _rowIndex, colIndex) => {
      const correio = String(row.values?.[0] ?? '').trim()
      const base = String(row.values?.[1] ?? '').trim()
      const payload = { correio, base }
      if (colIndex === 0) {
        setModalPending(payload)
        setLastSelectedEntregador(payload)
        try {
          localStorage.setItem(SELECTED_ENTREGADOR_STORAGE_KEY, JSON.stringify(payload))
        } catch (_) {
          /* localStorage cheio ou indisponível */
        }
      } else if (colIndex === 1) {
        navigate('/resultados-consulta/evolucao', { state: { base, view: 'base' } })
      } else if (colIndex === 3) {
        navigate('/resultados-consulta/evolucao', { state: payload })
      }
    },
    [navigate]
  )

  const pedidosEntregador = useMemo(() => {
    if (!modalEntregador) return []
    const { correio, base } = modalEntregador
    return dataFiltered.filter(
      (doc) =>
        String(doc[CORREIO_KEY] ?? '').trim() === correio &&
        String(doc[BASE_KEY] ?? '').trim() === base
    )
  }, [dataFiltered, modalEntregador])

  const pedidosFiltered = useMemo(() => {
    if (modalFilter === MODAL_FILTER_ENTREGUES) {
      return pedidosEntregador.filter((doc) => isEntregue(doc[MARCA_KEY]))
    }
    return pedidosEntregador.filter((doc) => isNaoEntregue(doc[MARCA_KEY]))
  }, [pedidosEntregador, modalFilter])

  const modalTotais = useMemo(() => ({
    entregues: pedidosEntregador.filter((doc) => isEntregue(doc[MARCA_KEY])).length,
    naoEntregues: pedidosEntregador.filter((doc) => isNaoEntregue(doc[MARCA_KEY])).length,
  }), [pedidosEntregador])

  const getMensagemFinal = useCallback(() => {
    const raw = mensagemEditRef.current?.innerText ?? mensagemTexto
    const total = pedidosEntregador.length
    const displayEntregador = (modalCorreio || '').trim() || '(entregador)'
    return substituirPlaceholders(raw, displayEntregador, saudacao, total, nomeUsuario)
  }, [mensagemTexto, modalCorreio, saudacao, nomeUsuario, pedidosEntregador.length])

  const handleOpenMensagemModal = useCallback(() => {
    const total = pedidosEntregador.length
    const phSaudacao = getPlaceholderSaudacao()
    mensagemPlaceholderSaudacaoRef.current = phSaudacao
    const saved = typeof mensagemSalva === 'string' && mensagemSalva.trim()
    const usarSalva = saved && mensagemMantemPlaceholders(mensagemSalva.trim(), phSaudacao)
    const msg = usarSalva ? mensagemSalva.trim() : getMensagemTemplate(total, phSaudacao)
    setMensagemTexto(msg)
    setMensagemEditKey((k) => k + 1)
    setMensagemModalOpen(true)
  }, [pedidosEntregador.length, mensagemSalva])

  const handleCopyMensagem = useCallback(async () => {
    try {
      const final = getMensagemFinal()
      await navigator.clipboard.writeText(final)
      showNotification('Mensagem copiada.', 'success')
    } catch {
      showNotification('Não foi possível copiar.', 'error')
    }
  }, [getMensagemFinal, showNotification])

  const handleWhatsAppComMensagem = useCallback(() => {
    const num = telefoneParaWhatsApp(modalTelefone)
    if (!num) {
      showNotification('Informe o número de telefone para abrir o WhatsApp.', 'error')
      return
    }
    const final = getMensagemFinal()
    const text = encodeURIComponent(final)
    window.open(`https://wa.me/${num}?text=${text}`, '_blank', 'noopener,noreferrer')
  }, [modalTelefone, getMensagemFinal, showNotification])

  const handleModalDownloadExcel = useCallback(() => {
    if (!pedidosFiltered?.length) {
      showNotification('Sem dados para exportar.', 'error')
      return
    }
    try {
      const header = [...MOTORISTA_COLUMNS]
      const rows = pedidosFiltered.map((doc) =>
        MOTORISTA_COLUMNS.map((key) => (doc[key] != null ? String(doc[key]) : ''))
      )
      const sheetRows = [header, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(sheetRows)
      const wb = XLSX.utils.book_new()
      const sheetName = modalFilter === MODAL_FILTER_ENTREGUES ? 'Entregues' : 'Não entregues'
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      const safe = (s) => String(s ?? '').replace(/[\\/*?[\]:]/g, '-').trim() || 'export'
      const fileName = `resultados-consulta-${safe(modalCorreio)}-${safe(modalBase)}-${modalFilter === MODAL_FILTER_ENTREGUES ? 'entregues' : 'nao-entregues'}.xlsx`
      XLSX.writeFile(wb, fileName)
      showNotification('Tabela exportada em Excel.', 'success')
    } catch (err) {
      showNotification('Não foi possível exportar o Excel.', 'error')
    }
  }, [pedidosFiltered, modalFilter, modalCorreio, modalBase, showNotification])

  /** Copia todos os dados em texto formatado (apenas colunas selecionadas na config). */
  const handleModalCopyFormatted = useCallback(async () => {
    if (!pedidosFiltered?.length) {
      showNotification('Sem dados para copiar.', 'error')
      return
    }
    const cols = columnsToCopy.length ? columnsToCopy : MOTORISTA_COLUMNS
    const blocks = pedidosFiltered.map((doc) =>
      cols.map((label) => `${label}: ${doc[label] != null ? String(doc[label]) : ''}`).join('\n')
    )
    const text = blocks.join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      showNotification('Dados copiados (texto formatado).', 'success')
    } catch {
      showNotification('Não foi possível copiar.', 'error')
    }
  }, [pedidosFiltered, columnsToCopy, showNotification])

  const segmentosMensagem = useMemo(() => getSegmentosMensagem(mensagemTexto), [mensagemTexto])

  /** Índices selecionados na tabela do modal (conforme filtro Entregues/Não entregues). */
  const [modalSelectedIndices, setModalSelectedIndices] = useState(() => new Set())

  useEffect(() => {
    setModalSelectedIndices(new Set())
  }, [modalFilter, modalEntregador])

  const modalSelectAllChecked = pedidosFiltered.length > 0 && modalSelectedIndices.size === pedidosFiltered.length
  const modalSelectAllIndeterminate = modalSelectedIndices.size > 0 && modalSelectedIndices.size < pedidosFiltered.length

  useEffect(() => {
    const el = modalSelectAllRef.current
    if (el) el.indeterminate = !!modalSelectAllIndeterminate
  }, [modalSelectAllIndeterminate])

  const toggleModalRowSelection = useCallback(
    (index) => {
      const doc = pedidosFiltered[index]
      const numero = doc != null ? doc[NUMERO_JMS_KEY] : null
      const value = numero != null && String(numero).trim() !== '' ? String(numero).trim() : null

      setModalSelectedIndices((prev) => {
        const next = new Set(prev)
        if (next.has(index)) next.delete(index)
        else {
          next.add(index)
          if (value != null) {
            navigator.clipboard.writeText(value).then(
              () => showNotification('Número JMS copiado.', 'success'),
              () => showNotification('Não foi possível copiar.', 'error')
            )
          }
        }
        return next
      })
    },
    [pedidosFiltered, showNotification]
  )

  const toggleModalSelectAll = useCallback(() => {
    if (modalSelectAllChecked) {
      setModalSelectedIndices(new Set())
    } else {
      setModalSelectedIndices(new Set(pedidosFiltered.map((_, i) => i)))
      const numeros = pedidosFiltered
        .map((doc) => doc[NUMERO_JMS_KEY])
        .filter((v) => v != null && String(v).trim() !== '')
      if (numeros.length > 0) {
        const text = numeros.map((v) => String(v).trim()).join('\n')
        navigator.clipboard.writeText(text).then(
          () => showNotification(`${numeros.length} número(s) JMS copiado(s).`, 'success'),
          () => showNotification('Não foi possível copiar.', 'error')
        )
      }
    }
  }, [modalSelectAllChecked, pedidosFiltered, showNotification])

  const goToPage = useCallback(
    (p) => {
      setPage(Math.max(1, Math.min(p, totalPages)))
    },
    [totalPages]
  )

  const handleRowsPerPageChange = useCallback((n) => {
    setRowsPerPage(n)
    setPage(1)
  }, [])

  return (
    <div className="resultados-consulta resultados-consulta--with-loader">
      <section className="resultados-consulta__content">
        {!loading && (
          <>
            <div className="resultados-consulta__toolbar">
              {total > 0 ? (
                <>
                  <div className="resultados-consulta__search-wrap">
                    <input
                      id="resultados-consulta-search"
                      type="text"
                      className="resultados-consulta__search-input"
                      placeholder="Correio de coleta ou entrega..."
                      value={searchCorreio}
                      onChange={(e) => setSearchCorreio(e.target.value)}
                      aria-label="Pesquisar por Correio de coleta ou entrega"
                    />
                  </div>
                  <div className="resultados-consulta__toolbar-spacer" />
                </>
              ) : (
                <div className="resultados-consulta__toolbar-spacer" />
              )}
              <div className="resultados-consulta__toolbar-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="resultados-consulta__file-input"
                  aria-hidden
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className="resultados-consulta__btn-config"
                  onClick={() => setShowConfigModal(true)}
                  disabled={loading}
                  title="Configurações e filtros"
                  aria-label="Abrir configurações (coleção, data, incluir não entregues)"
                >
                  <MdSettings className="resultados-consulta__btn-config-icon" />
                </button>
                <div className="resultados-consulta__copy-wrap" ref={copyDropdownRef}>
                  <button
                    type="button"
                    className="resultados-consulta__btn-copy"
                    onClick={() => setCopyDropdownOpen((o) => !o)}
                    disabled={deleting}
                    title="Copiar números JMS com Marca de assinatura «Não entregue» (em lotes de 1000)"
                    aria-label="Abrir menu copiar números JMS não entregues"
                    aria-expanded={copyDropdownOpen}
                    aria-haspopup="true"
                  >
                    <CiFilter className="resultados-consulta__btn-copy-icon" />
                  </button>
                  {copyDropdownOpen && (
                    <div className="resultados-consulta__copy-dropdown" role="menu">
                      {numerosChunks.length === 0 ? (
                        <p className="resultados-consulta__copy-empty">
                          Nenhum número JMS com Marca de assinatura «Não entregue».
                        </p>
                      ) : (
                        numerosChunks.map((chunk, i) => (
                          <button
                            key={i}
                            type="button"
                            className="resultados-consulta__copy-chunk-btn"
                            role="menuitem"
                            onClick={() => handleCopyChunk(chunk)}
                          >
                            <span className="resultados-consulta__copy-chunk-label">Lote {i + 1}</span>
                            <span className="resultados-consulta__copy-chunk-count">
                              {chunk.length} número{chunk.length !== 1 ? 's' : ''}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="resultados-consulta__btn-update"
                  onClick={handleAtualizarClick}
                  disabled={updating}
                  title="Atualizar coleção motorista com arquivo Excel (.xlsx)"
                  aria-label="Atualizar motorista com arquivo"
                >
                  <MdUpload className="resultados-consulta__btn-update-icon" />
                </button>
                <button
                  type="button"
                  className="resultados-consulta__btn-delete"
                  onClick={() => setShowConfirmExcluir(true)}
                  disabled={deleting}
                  title="Limpar coleção motorista"
                  aria-label="Limpar motorista"
                >
                  <MdOutlineDelete className="resultados-consulta__btn-delete-icon" />
                </button>
              </div>
            </div>
            {!loading && total === 0 && (
              <div className="resultados-consulta__aviso-container" role="status" aria-live="polite">
                <div className="resultados-consulta__aviso-content">
                  <h2 className="resultados-consulta__aviso-title">Área de trabalho</h2>
                  <MdSpaceDashboard className="resultados-consulta__aviso-icon" aria-hidden />
                </div>
              </div>
            )}
            <AnimatePresence>
              {showConfigModal && (
                <motion.div
                  key="config-modal"
                  className="resultados-consulta__confirm-overlay"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="resultados-consulta-config-title"
                  variants={overlayVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={transition}
                  onClick={() => setShowConfigModal(false)}
                >
                  <motion.div
                    className="resultados-consulta__config-modal resultados-consulta__confirm-modal"
                    variants={modalContentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={transition}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="resultados-consulta__config-modal-header">
                      <h2 id="resultados-consulta-config-title" className="resultados-consulta__confirm-title">
                        Configurações
                      </h2>
                      <button
                        type="button"
                        className="resultados-consulta__config-modal-close"
                        onClick={() => setShowConfigModal(false)}
                        aria-label="Fechar configurações"
                      >
                        <MdClose aria-hidden />
                      </button>
                    </div>
                    <div className="resultados-consulta__config-modal-body">
                      <div className="resultados-consulta__colecao-wrap">
                        <label htmlFor="resultados-consulta-colecao" className="resultados-consulta__colecao-label">
                          Coleção
                        </label>
                        <select
                          id="resultados-consulta-colecao"
                          className="resultados-consulta__select-colecao"
                          value="motorista"
                          aria-label="Coleção a exibir"
                          title="Selecione a coleção (Base em breve)"
                        >
                          <option value="motorista">Motorista — Pronto</option>
                          <option value="base" disabled>Base — Em breve</option>
                        </select>
                      </div>
                      <DateFilterSelect
                        token={token}
                        fetchDatas={() => getResultadosConsultaMotoristaDatas(token)}
                        selectedDatas={selectedDatas}
                        onChange={handleDatasChange}
                        label="Data do envio"
                        disabled={loading}
                        className="resultados-consulta__date-filter"
                      />
                      <div className="resultados-consulta__incluir-outras-wrap">
                        <label className="resultados-consulta__incluir-outras-label">
                          <input
                            type="checkbox"
                            className="resultados-consulta__incluir-outras-checkbox"
                            checked={incluirNaoEntreguesOutrasDatas}
                            onChange={async (e) => {
                              if (e.target.checked) {
                                setIncluirNaoEntreguesOutrasDatas(true)
                                if (token) {
                                  try {
                                    const data = await updateConfig(token, { incluir_nao_entregues_outras_datas: true })
                                    setUser({ ...user, config: data?.config ?? { ...user?.config, incluir_nao_entregues_outras_datas: true } })
                                  } catch (err) {
                                    showNotification(err.message || 'Erro ao salvar preferência.', 'error')
                                  }
                                }
                              } else {
                                setShowConfigModal(false)
                                setShowConfirmDesativarIncluir(true)
                              }
                            }}
                            disabled={loading}
                            aria-describedby="resultados-consulta-incluir-outras-desc"
                          />
                          <span id="resultados-consulta-incluir-outras-desc">
                            Incluir não entregues de outras datas
                          </span>
                        </label>
                      </div>
                      <div className="resultados-consulta__config-filtros-wrap">
                        <p className="resultados-consulta__config-filtros-desc">
                          Se não selecionar nenhum, a tabela mostra todos. Ao guardar, a tabela exibe apenas os registos que correspondem à sua seleção.
                        </p>
                        <div className="resultados-consulta__config-filtro-group">
                          <span className="resultados-consulta__config-filtro-label">Dias sem movimentação</span>
                          <div className="resultados-consulta__config-filtro-list" role="group" aria-label="Dias sem movimentação">
                            {uniqueDiasSemMovimentacao.length === 0 ? (
                              <p className="resultados-consulta__config-filtro-empty">Carregue os dados para ver as opções.</p>
                            ) : (
                              uniqueDiasSemMovimentacao.map((valor) => (
                                <label key={valor} className="resultados-consulta__config-filtro-item">
                                  <input
                                    type="checkbox"
                                    checked={configDiasSelection.includes(valor)}
                                    onChange={() => toggleConfigDias(valor)}
                                    className="resultados-consulta__config-filtro-checkbox"
                                  />
                                  <span>{valor}</span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="resultados-consulta__config-filtro-group">
                          <span className="resultados-consulta__config-filtro-label">Bases</span>
                          <div className="resultados-consulta__config-filtro-list" role="group" aria-label="Bases">
                            {uniqueBases.length === 0 ? (
                              <p className="resultados-consulta__config-filtro-empty">Carregue os dados para ver as opções.</p>
                            ) : (
                              uniqueBases.map((base) => (
                                <label key={base} className="resultados-consulta__config-filtro-item">
                                  <input
                                    type="checkbox"
                                    checked={configBasesSelection.includes(base)}
                                    onChange={() => toggleConfigBase(base)}
                                    className="resultados-consulta__config-filtro-checkbox"
                                  />
                                  <span>{base}</span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="resultados-consulta__config-filtros-actions">
                          <button
                            type="button"
                            className="resultados-consulta__config-filtros-btn resultados-consulta__config-filtros-btn--primary"
                            onClick={handleSaveConfigFiltros}
                            disabled={savingConfigFiltros}
                          >
                            {savingConfigFiltros ? 'A guardar…' : 'Guardar filtros'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showConfirmDesativarIncluir && (
                <motion.div
                  key="confirm-desativar-modal"
                  className="resultados-consulta__confirm-overlay"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="resultados-consulta-confirm-desativar-title"
                  variants={overlayVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={transition}
                  onClick={() => setShowConfirmDesativarIncluir(false)}
                >
                  <motion.div
                    className="resultados-consulta__confirm-modal"
                    variants={modalContentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={transition}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 id="resultados-consulta-confirm-desativar-title" className="resultados-consulta__confirm-title">
                      Desativar «Incluir não entregues de outras datas»?
                    </h2>
                    <p className="resultados-consulta__confirm-text">
                      A lista passará a mostrar apenas os registros das datas selecionadas. Os não entregues de outras datas deixarão de ser exibidos.
                    </p>
                    <div className="resultados-consulta__confirm-actions">
                      <button
                        type="button"
                        className="resultados-consulta__confirm-btn resultados-consulta__confirm-btn--secondary"
                        onClick={() => setShowConfirmDesativarIncluir(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="resultados-consulta__confirm-btn resultados-consulta__confirm-btn--primary"
                        onClick={handleConfirmarDesativarIncluir}
                      >
                        Desativar
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showConfirmExcluir && (
                <motion.div
                  key="confirm-excluir-modal"
                  className="resultados-consulta__confirm-overlay"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="resultados-consulta-confirm-title"
                  variants={overlayVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={transition}
                  onClick={() => setShowConfirmExcluir(false)}
                >
                  <motion.div
                    className="resultados-consulta__confirm-modal"
                    variants={modalContentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={transition}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 id="resultados-consulta-confirm-title" className="resultados-consulta__confirm-title">
                      Limpar coleção motorista?
                    </h2>
                    <p className="resultados-consulta__confirm-text">
                      Todos os registros da lista do motorista serão removidos. Esta ação não pode ser desfeita.
                    </p>
                    <div className="resultados-consulta__confirm-actions">
                      <button
                        type="button"
                        className="resultados-consulta__confirm-btn resultados-consulta__confirm-btn--secondary"
                        onClick={() => setShowConfirmExcluir(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="resultados-consulta__confirm-btn resultados-consulta__confirm-btn--primary"
                        onClick={handleConfirmarExcluir}
                        disabled={deleting}
                      >
                        {deleting ? 'A remover…' : 'Limpar'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            {total > 0 && (
              <>
                <div className="resultados-consulta__table-wrap" ref={filterDropdownRef}>
                  <div className="resultados-consulta__data-table resultados-consulta__data-table--full">
                    <DataTable
                      headerValues={headerValuesWithTotalBadge}
                      bodyRows={bodyRows}
                      maxCols={maxCols}
                      start={start}
                      totalRows={totalGrouped}
                      totalPages={totalPages}
                      currentPage={currentPage}
                      rowsPerPage={rowsPerPage}
                      rowsPerPageOptions={VALID_ROWS_PER_PAGE}
                      onRowsPerPageChange={handleRowsPerPageChange}
                      onPageChange={goToPage}
                      onHeaderClick={handleHeaderClick}
                      activeFilterColIndices={activeFilterColIndices}
                      onCellClick={handleCellClick}
                      clickableColIndices={[0, 1, 3]}
                      selectedRowId={selectedRowId}
                    />
                  </div>
                  {openFilterIndex !== null && filterDropdownAnchorRect && (
                    <div
                      className="resultados-consulta__filter-dropdown resultados-consulta__filter-dropdown--fixed"
                      style={{
                        position: 'fixed',
                        top: filterDropdownAnchorRect.top + 2,
                        left: filterDropdownAnchorRect.left,
                        minWidth: Math.max(filterDropdownAnchorRect.width, 200),
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="resultados-consulta__filter-dropdown-inner">
                        {filterLoading ? (
                          <div className="resultados-consulta__filter-loading" aria-busy="true">
                            <span className="resultados-consulta__filter-spinner" aria-hidden />
                            <span className="resultados-consulta__filter-loading-text">Carregando…</span>
                          </div>
                        ) : (
                          <>
                            <div className="resultados-consulta__filter-dropdown-search-wrap">
                              <input
                                type="text"
                                className="resultados-consulta__filter-dropdown-search"
                                placeholder="Pesquisar..."
                                value={filterSearchTerm}
                                onChange={(e) => setFilterSearchTerm(e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="resultados-consulta__filter-dropdown-list">
                              <div className="resultados-consulta__filter-menu">
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
                                        className={`resultados-consulta__filter-menu-item ${checked ? 'resultados-consulta__filter-menu-item--selected' : ''}`}
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          toggleFilterValue(openFilterIndex, optionValue)
                                        }}
                                      >
                                        <span className="resultados-consulta__filter-menu-icon" aria-hidden>
                                          {checked ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                                          ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                                          )}
                                        </span>
                                        <span className="resultados-consulta__filter-menu-text">{optionValue}</span>
                                      </button>
                                    )
                                  })}
                              </div>
                            </div>
                            <div className="resultados-consulta__filter-dropdown-footer">
                              <div className="resultados-consulta__filter-menu-separator" />
                              <button
                                type="button"
                                className="resultados-consulta__filter-menu-item resultados-consulta__filter-menu-item--action"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  clearColumnFilter(openFilterIndex)
                                }}
                              >
                                <span className="resultados-consulta__filter-menu-icon" aria-hidden>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </span>
                                <span className="resultados-consulta__filter-menu-text">Limpar filtro</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {modalAberto && (
                    <motion.div
                      key="resultados-consulta-modal-entregador"
                      className="resultados-consulta__modal-overlay"
                      variants={overlayVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={transition}
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="resultados-consulta-modal-title"
                    >
                      <motion.div
                        className="resultados-consulta__modal"
                        variants={modalContentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={transition}
                      >
                        <div className="resultados-consulta__modal-header resultados-consulta__modal-header--dark">
                          <Logo jtColor="white" className="resultados-consulta__modal-header-logo" />
                          <p id="resultados-consulta-modal-title" className="resultados-consulta__modal-header-info">
                            Pedidos do entregador {(modalEntregador || modalPending)?.correio ?? '(vazio)'} <br />
                            {(modalEntregador || modalPending)?.base ? ` — ${(modalEntregador || modalPending).base}` : ''} <br />
                            {(modalEntregador || modalPending) && (
                              <span className="resultados-consulta__modal-header-total">
                                — {pedidosEntregador.length} pedido{pedidosEntregador.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </p>
                          <button
                            type="button"
                            className="resultados-consulta__modal-btn-close resultados-consulta__modal-btn-close--dark"
                            onClick={closeModal}
                            aria-label="Fechar"
                          >
                            <MdClose size={22} aria-hidden />
                          </button>
                        </div>
                        <div className="resultados-consulta__modal-tabs">
                          <div className="resultados-consulta__modal-tabs-buttons">
                            <button
                              type="button"
                              className={`resultados-consulta__modal-tab ${modalFilter === MODAL_FILTER_ENTREGUES ? 'resultados-consulta__modal-tab--active' : ''}`}
                              onClick={() => setModalFilterAndSave(MODAL_FILTER_ENTREGUES)}
                              aria-pressed={modalFilter === MODAL_FILTER_ENTREGUES}
                            >
                              <span className="resultados-consulta__modal-tab-label">Entregues</span>
                              <span className="resultados-consulta__modal-tab-total">{modalTotais.entregues}</span>
                            </button>
                            <button
                              type="button"
                              className={`resultados-consulta__modal-tab ${modalFilter === MODAL_FILTER_NAO_ENTREGUES ? 'resultados-consulta__modal-tab--active' : ''}`}
                              onClick={() => setModalFilterAndSave(MODAL_FILTER_NAO_ENTREGUES)}
                              aria-pressed={modalFilter === MODAL_FILTER_NAO_ENTREGUES}
                            >
                              <span className="resultados-consulta__modal-tab-label">Não entregues</span>
                              <span className="resultados-consulta__modal-tab-total">{modalTotais.naoEntregues}</span>
                            </button>
                          </div>
                          <div className="resultados-consulta__modal-toolbar">
                            <div className="resultados-consulta__modal-phone-wrap">
                              <input
                                id="resultados-consulta-modal-phone"
                                type="tel"
                                className="resultados-consulta__modal-phone-input"
                                placeholder={modalContatoDocId ? 'Telefone' : 'Adicionar número (guardar na lista de telefones)'}
                                value={modalTelefone}
                                onChange={(e) => setModalTelefone(e.target.value)}
                                readOnly={!!modalContatoDocId && !modalPhoneEditing}
                                aria-label="Telefone"
                              />
                              {modalContatoDocId && !modalPhoneEditing && (
                                <button
                                  type="button"
                                  className="resultados-consulta__modal-action-btn resultados-consulta__modal-phone-edit-btn"
                                  title="Editar telefone"
                                  aria-label="Editar telefone"
                                  onClick={() => setModalPhoneEditing(true)}
                                >
                                  <MdEdit className="resultados-consulta__modal-action-icon" aria-hidden />
                                </button>
                              )}
                              {(!modalContatoDocId || modalPhoneEditing) && (
                                <button
                                  type="button"
                                  className="resultados-consulta__modal-action-btn resultados-consulta__modal-phone-save-btn"
                                  title={modalContatoDocId ? 'Guardar telefone' : 'Guardar número na lista de telefones'}
                                  aria-label={modalContatoDocId ? 'Guardar telefone' : 'Guardar número na lista de telefones'}
                                  disabled={modalSavingContato}
                                  onClick={handleModalSaveContato}
                                >
                                  <MdCheck className="resultados-consulta__modal-action-icon" aria-hidden />
                                </button>
                              )}
                            </div>
                            <div className="resultados-consulta__modal-toolbar-actions">
                              <button
                                type="button"
                                className="resultados-consulta__modal-action-btn"
                                title="Copiar todos os dados (texto formatado)"
                                aria-label="Copiar todos os dados (texto formatado)"
                                disabled={!pedidosFiltered?.length}
                                onClick={handleModalCopyFormatted}
                              >
                                <MdContentCopy className="resultados-consulta__modal-action-icon" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="resultados-consulta__modal-action-btn"
                                title="Descarregar tabela em Excel"
                                aria-label="Descarregar tabela em Excel"
                                disabled={!pedidosFiltered?.length}
                                onClick={handleModalDownloadExcel}
                              >
                                <MdDownload className="resultados-consulta__modal-action-icon" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="resultados-consulta__modal-action-btn"
                                title="Configurações — colunas a copiar"
                                aria-label="Configurações — colunas a copiar"
                                onClick={openModalConfigColunas}
                              >
                                <MdSettings className="resultados-consulta__modal-action-icon" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="resultados-consulta__modal-action-btn"
                                title="Escrever mensagem para envio"
                                aria-label="Escrever mensagem para envio"
                                onClick={handleOpenMensagemModal}
                              >
                                <MdMessage className="resultados-consulta__modal-action-icon" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="resultados-consulta__modal-action-btn resultados-consulta__modal-action-btn--whatsapp"
                                title="Abrir WhatsApp com este número"
                                aria-label="Abrir WhatsApp com este número"
                                onClick={handleModalOpenWhatsApp}
                              >
                                <svg className="resultados-consulta__modal-action-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                                  <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="resultados-consulta__modal-table-wrap">
                          {(!modalEntregador || !modalContentReady) ? (
                            <div className="resultados-consulta__modal-loading">
                              <Loader text="A carregar…" size="sm" />
                            </div>
                          ) : (
                            <table className="resultados-consulta__modal-table">
                              <thead>
                                <tr>
                                  <th className="resultados-consulta__modal-th resultados-consulta__modal-th--select" scope="col" aria-label="Copiar todos">
                                    <label className="resultados-consulta__modal-select-all-wrap">
                                      <input
                                        ref={modalSelectAllRef}
                                        type="checkbox"
                                        className="resultados-consulta__modal-checkbox"
                                        checked={modalSelectAllChecked}
                                        onChange={toggleModalSelectAll}
                                        aria-label="Copiar todos os números JMS da lista"
                                      />
                                    </label>
                                  </th>
                                  <th className="resultados-consulta__modal-th resultados-consulta__modal-th--id">ID</th>
                                  {MOTORISTA_COLUMNS.map((col, i) => (
                                    <th key={i} className="resultados-consulta__modal-th">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {pedidosFiltered.map((doc, i) => (
                                  <tr key={i}>
                                    <td className="resultados-consulta__modal-td resultados-consulta__modal-td--select">
                                      <label className="resultados-consulta__modal-row-select-wrap">
                                        <input
                                          type="checkbox"
                                          className="resultados-consulta__modal-checkbox"
                                          checked={modalSelectedIndices.has(i)}
                                          onChange={() => toggleModalRowSelection(i)}
                                          aria-label={`Copiar número JMS ${doc[NUMERO_JMS_KEY] ?? i + 1}`}
                                        />
                                      </label>
                                    </td>
                                    <td className="resultados-consulta__modal-td resultados-consulta__modal-td--id">
                                      {String(i + 1).padStart(2, '0')}
                                    </td>
                                    {MOTORISTA_COLUMNS.map((key, j) => (
                                      <td key={j} className="resultados-consulta__modal-td">
                                        {doc[key] != null ? String(doc[key]) : ''}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                  {modalAberto && mensagemModalOpen && (
                    <motion.div
                      key="resultados-consulta-mensagem-modal-overlay"
                      className="resultados-consulta__modal-overlay resultados-consulta__mensagem-modal-overlay"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="resultados-consulta-mensagem-modal-title"
                      variants={overlayVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={transition}
                      onClick={() => setMensagemModalOpen(false)}
                    >
                      <motion.div
                        className="resultados-consulta__modal resultados-consulta__mensagem-modal"
                        variants={modalContentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={transition}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="resultados-consulta__mensagem-modal-header">
                          <h2 id="resultados-consulta-mensagem-modal-title" className="resultados-consulta__mensagem-modal-title">
                            Mensagem para envio
                          </h2>
                          <button type="button" className="resultados-consulta__mensagem-modal-close" onClick={() => setMensagemModalOpen(false)} aria-label="Fechar">
                            <MdClose size={22} aria-hidden />
                          </button>
                        </div>
                        <div className="resultados-consulta__mensagem-modal-body">
                          <label className="resultados-consulta__mensagem-modal-label" id="resultados-consulta-mensagem-label">
                            Mensagem (pode editar; os textos entre parênteses não podem ser apagados):
                          </label>
                          <div
                            key={mensagemEditKey}
                            ref={mensagemEditRef}
                            id="resultados-consulta-mensagem-texto"
                            className="resultados-consulta__mensagem-modal-textarea resultados-consulta__mensagem-modal-edit"
                            contentEditable
                            suppressContentEditableWarning
                            onInput={handleMensagemTextoChange}
                            onPaste={handleMensagemPaste}
                            role="textbox"
                            aria-label="Mensagem para envio"
                            aria-labelledby="resultados-consulta-mensagem-label"
                            data-placeholder="Digite a mensagem..."
                          >
                            {segmentosMensagem.map((seg, i) =>
                              seg.type === 'placeholder' ? (
                                <span key={`${i}-${seg.value}`} className="resultados-consulta__mensagem-placeholder" contentEditable={false} suppressContentEditableWarning>
                                  {seg.value}
                                </span>
                              ) : (
                                seg.value
                              )
                            )}
                          </div>
                          <div className="resultados-consulta__mensagem-modal-actions">
                            <button type="button" className="resultados-consulta__mensagem-modal-btn resultados-consulta__mensagem-modal-btn--save" onClick={handleGuardarMensagem} disabled={savingMensagem}>
                              {savingMensagem ? 'A guardar…' : 'Guardar no servidor'}
                            </button>
                            <button type="button" className="resultados-consulta__mensagem-modal-btn resultados-consulta__mensagem-modal-btn--copy" onClick={handleCopyMensagem}>
                              Copiar mensagem
                            </button>
                            <button type="button" className="resultados-consulta__mensagem-modal-btn resultados-consulta__mensagem-modal-btn--whatsapp" onClick={handleWhatsAppComMensagem}>
                              Abrir no WhatsApp
                            </button>
                            <button type="button" className="resultados-consulta__mensagem-modal-btn resultados-consulta__mensagem-modal-btn--secondary" onClick={() => setMensagemModalOpen(false)}>
                              Fechar
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                  {modalAberto && modalConfigColunasOpen && (
                    <motion.div
                      key="resultados-consulta-config-colunas-overlay"
                      className="resultados-consulta__modal-overlay resultados-consulta__mensagem-modal-overlay"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="resultados-consulta-config-colunas-title"
                      variants={overlayVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={transition}
                      onClick={() => setModalConfigColunasOpen(false)}
                    >
                      <motion.div
                        className="resultados-consulta__modal resultados-consulta__config-colunas-modal"
                        variants={modalContentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={transition}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="resultados-consulta__mensagem-modal-header">
                          <h2 id="resultados-consulta-config-colunas-title" className="resultados-consulta__mensagem-modal-title">
                            Colunas a copiar
                          </h2>
                          <button type="button" className="resultados-consulta__mensagem-modal-close" onClick={() => setModalConfigColunasOpen(false)} aria-label="Fechar">
                            <MdClose size={22} aria-hidden />
                          </button>
                        </div>
                        <div className="resultados-consulta__config-colunas-body">
                          <p className="resultados-consulta__config-colunas-desc">
                            Selecione as colunas que o botão Copiar incluirá no texto formatado.
                          </p>
                          <div className="resultados-consulta__config-colunas-list" role="group" aria-labelledby="resultados-consulta-config-colunas-title">
                            {MOTORISTA_COLUMNS.map((col) => (
                              <label key={col} className="resultados-consulta__config-colunas-item">
                                <input
                                  type="checkbox"
                                  checked={modalConfigColunasSelection.includes(col)}
                                  onChange={() => toggleModalConfigColuna(col)}
                                  className="resultados-consulta__config-colunas-checkbox"
                                />
                                <span className="resultados-consulta__config-colunas-label">{col}</span>
                              </label>
                            ))}
                          </div>
                          <div className="resultados-consulta__mensagem-modal-actions">
                            <button
                              type="button"
                              className="resultados-consulta__mensagem-modal-btn resultados-consulta__mensagem-modal-btn--save"
                              onClick={handleSaveConfigColunas}
                              disabled={savingConfigColunas || modalConfigColunasSelection.length === 0}
                            >
                              {savingConfigColunas ? 'A guardar…' : 'Guardar'}
                            </button>
                            <button type="button" className="resultados-consulta__mensagem-modal-btn resultados-consulta__mensagem-modal-btn--secondary" onClick={() => setModalConfigColunasOpen(false)}>
                              Fechar
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
            </AnimatePresence>
              </>
            )}
          </>
        )}
      </section>
    </div>
  )
}
