/**
 * Modal com a lista de pedidos não entregues de um motorista (ao clicar na coluna Não entregues).
 * Coluna de marcar: ao marcar uma linha copia o "Número de pedido JMS" dessa linha; ao marcar o cabeçalho copia todos.
 */
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { MdSettings, MdMessage, MdDownload, MdEdit, MdCheck, MdContentCopy } from 'react-icons/md'
import * as XLSX from 'xlsx'
import { AnimatePresence, motion } from 'framer-motion'
import { overlayVariants, modalContentVariants, transition } from '../../../../utils/animations'
import { Logo } from '../../../../components/Logo'
import { getSLANaoEntregues, getSLAEntradaGalpao, getSLAEntregues, getContatoListaTelefones, updateContatoListaTelefones, upsertContatoListaTelefones, updateConfig } from '../../../../services'
import { useNotification } from '../../../../context/NotificationContext'
import { useAppContext } from '../../../../context'
import './SLANaoEntreguesModal.css'

/** Retorna "Bom dia" | "Boa tarde" | "Boa noite" conforme o horário. */
function getSaudacao() {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Placeholders que não podem ser apagados; ao copiar/enviar são substituídos pelos valores reais. */
const PLACEHOLDER_MOTORISTA = '(Nome do motorista)'
const PLACEHOLDER_TOTAL = '(Total de pedidos)'
const PLACEHOLDER_USUARIO = '(Nome do usuário)'
const PLACEHOLDERS_SAUDACAO = ['(Bom dia)', '(Boa tarde)', '(Boa noite)']

function getPlaceholderSaudacao() {
  const s = getSaudacao()
  if (s === 'Bom dia') return '(Bom dia)'
  if (s === 'Boa tarde') return '(Boa tarde)'
  return '(Boa noite)'
}

/** Verifica se o texto ainda contém todos os placeholders obrigatórios (não podem ser apagados). */
function mensagemMantemPlaceholders(texto, placeholderSaudacao) {
  const t = String(texto ?? '')
  if (!t.includes(PLACEHOLDER_MOTORISTA)) return false
  if (!t.includes(placeholderSaudacao)) return false
  if (!t.includes(PLACEHOLDER_TOTAL)) return false
  if (!t.includes(PLACEHOLDER_USUARIO)) return false
  return true
}

/** Retorna o template da mensagem com placeholders (abertura do modal). */
function getMensagemTemplate(total, placeholderSaudacao) {
  return `Olá ${PLACEHOLDER_MOTORISTA}, ${placeholderSaudacao} meu nome é ${PLACEHOLDER_USUARIO} e sou da torre de controle J&T express. Constam em aberto ${PLACEHOLDER_TOTAL} pedido${total !== 1 ? 's' : ''}. Você conseguirá finalizar hoje? Aguardo seu retorno. Atenciosamente, ${PLACEHOLDER_USUARIO}`
}

/** Retorna apenas os placeholders (o que não pode ser excluído), para exibir após apagar tudo. */
function getMensagemApenasPlaceholders(placeholderSaudacao) {
  return `${PLACEHOLDER_MOTORISTA}, ${placeholderSaudacao}, ${PLACEHOLDER_USUARIO}, ${PLACEHOLDER_TOTAL}, ${PLACEHOLDER_USUARIO}`
}

/** Substitui os placeholders pelo valores reais para copiar/enviar. */
function substituirPlaceholders(texto, motorista, saudacaoReal, total, nomeUsuario) {
  let out = String(texto ?? '')
  out = out.split(PLACEHOLDER_MOTORISTA).join(motorista)
  out = out.split(PLACEHOLDER_TOTAL).join(String(total))
  out = out.split(PLACEHOLDER_USUARIO).join(nomeUsuario)
  PLACEHOLDERS_SAUDACAO.forEach((ph) => {
    out = out.split(ph).join(saudacaoReal)
  })
  return out
}

const TODOS_PLACEHOLDERS = [
  PLACEHOLDER_MOTORISTA,
  PLACEHOLDER_TOTAL,
  PLACEHOLDER_USUARIO,
  ...PLACEHOLDERS_SAUDACAO,
]

/** Divide o texto em segmentos de texto livre e placeholders (para renderizar com cores). */
function getSegmentosMensagem(texto) {
  const t = String(texto ?? '')
  const segmentos = []
  let restante = t
  while (restante.length > 0) {
    let menorIdx = -1
    let qual = ''
    for (const ph of TODOS_PLACEHOLDERS) {
      const i = restante.indexOf(ph)
      if (i !== -1 && (menorIdx === -1 || i < menorIdx)) {
        menorIdx = i
        qual = ph
      }
    }
    if (menorIdx === -1) {
      if (restante) segmentos.push({ type: 'text', value: restante })
      break
    }
    if (menorIdx > 0) {
      segmentos.push({ type: 'text', value: restante.slice(0, menorIdx) })
    }
    segmentos.push({ type: 'placeholder', value: qual })
    restante = restante.slice(menorIdx + qual.length)
  }
  return segmentos
}

/** Formata número brasileiro: só dígitos; se 10 dígitos (DD + 8), insere 9 após DDD (celular). */
function formatarTelefoneComNove(val) {
  const digits = String(val ?? '').replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('1') === false) {
    return digits.slice(0, 2) + '9' + digits.slice(2)
  }
  return digits
}

/** Número para wa.me: 55 + DDD + número (com 9 se tiver 10 dígitos). */
function telefoneParaWhatsApp(val) {
  const digits = formatarTelefoneComNove(val)
  if (digits.length < 10) return ''
  return '55' + digits
}

/** Índice da coluna "Número de pedido JMS" no header (normalizado, aceita variações). */
function getJmsColumnIndex(headerList) {
  if (!Array.isArray(headerList)) return -1
  const norm = (s) =>
    String(s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\u0300-\u036f/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  return headerList.findIndex((h) => {
    const n = norm(h)
    return (
      n.includes('numero de pedido jms') ||
      n.includes('numero pedido jms') ||
      n === 'numero de pedido jms' ||
      (n.includes('pedido') && n.includes('jms'))
    )
  })
}

export default function SLANaoEntreguesModal({
  open,
  onClose,
  token,
  motorista = '',
  base = '',
  datas = null,
  periodo = null,
  cidades = null,
  tipo = 'nao-entregues', // 'nao-entregues' | 'entrada-galpao' | 'entregues'
}) {
  const { showNotification } = useNotification()
  const { user, refetchUser } = useAppContext()
  const nomeUsuario = user?.nome ?? ''
  const mensagemSalva = user?.config?.mensagem_sla_nao_entregues
  const [data, setData] = useState([])
  const [header, setHeader] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  /** 'none' | 'all' = todos marcados | 'one' = só uma linha marcada */
  const [copyMode, setCopyMode] = useState('none')
  const [selectedRowId, setSelectedRowId] = useState(null)
  const [telefone, setTelefone] = useState('')
  /** _id do documento na lista_telefones (para atualizar contato); null se não encontrado. */
  const [contatoDocId, setContatoDocId] = useState(null)
  const [phoneEditing, setPhoneEditing] = useState(false)
  const [savingContato, setSavingContato] = useState(false)
  const [mensagemModalOpen, setMensagemModalOpen] = useState(false)
  const [mensagemTexto, setMensagemTexto] = useState('')
  const [savingMensagem, setSavingMensagem] = useState(false)
  /** Key para forçar re-render do contenteditable ao restaurar template (deixar placeholders visíveis). */
  const [mensagemEditKey, setMensagemEditKey] = useState(0)
  /** Placeholder de saudação inserido ao abrir o modal (para não permitir apagar). */
  const mensagemPlaceholderSaudacaoRef = useRef('(Boa tarde)')
  const mensagemTextoRef = useRef(mensagemTexto)
  mensagemTextoRef.current = mensagemTexto
  const mensagemEditRef = useRef(null)

  const [configColunasOpen, setConfigColunasOpen] = useState(false)
  const [configColunasSelection, setConfigColunasSelection] = useState([])
  const [savingConfigColunas, setSavingConfigColunas] = useState(false)

  const colunasCopiaConfig = user?.config?.colunas_copia_sla_nao_entregues
  const columnsToCopy = useMemo(() => {
    if (!header?.length) return []
    if (Array.isArray(colunasCopiaConfig) && colunasCopiaConfig.length > 0) {
      const set = new Set(header)
      const valid = colunasCopiaConfig.filter((c) => set.has(c))
      if (valid.length > 0) return valid
    }
    return [...header]
  }, [header, colunasCopiaConfig])

  const openConfigColunas = useCallback(() => {
    const list = columnsToCopy.length ? [...columnsToCopy] : (header?.length ? [...header] : [])
    setConfigColunasSelection(list)
    setConfigColunasOpen(true)
  }, [columnsToCopy, header])

  const handleSaveConfigColunas = useCallback(async () => {
    if (!token) return
    setSavingConfigColunas(true)
    try {
      await updateConfig(token, { colunas_copia_sla_nao_entregues: configColunasSelection })
      await refetchUser()
      setConfigColunasOpen(false)
      showNotification('Colunas para cópia guardadas.', 'success')
    } catch (err) {
      showNotification(err?.message ?? 'Não foi possível guardar.', 'error')
    } finally {
      setSavingConfigColunas(false)
    }
  }, [token, configColunasSelection, refetchUser, showNotification])

  const toggleConfigColuna = useCallback((col) => {
    setConfigColunasSelection((prev) => {
      const next = prev.filter((c) => c !== col)
      if (next.length === prev.length) return [...prev, col]
      return next
    })
  }, [])

  const jmsColIndex = useMemo(() => getJmsColumnIndex(header), [header])
  const saudacao = useMemo(() => getSaudacao(), [])
  const totalPedidos = data?.length ?? 0
  const displayMotoristaForMsg = (motorista || '').trim() || '(motorista)'
  /** Mensagem final para copiar/WhatsApp: lida do contenteditable e placeholders substituídos. */
  const getMensagemFinal = useCallback(() => {
    const raw = mensagemEditRef.current?.innerText ?? mensagemTexto
    return substituirPlaceholders(raw, displayMotoristaForMsg, saudacao, totalPedidos, nomeUsuario)
  }, [mensagemTexto, displayMotoristaForMsg, saudacao, totalPedidos, nomeUsuario])

  const copyToClipboard = useCallback(
    async (text, count) => {
      if (text == null || String(text).trim() === '') return
      const num = count != null ? count : (String(text).match(/\n/g) || []).length + 1
      try {
        await navigator.clipboard.writeText(String(text).trim())
        const msg = num === 1 ? '1 número copiado.' : `${num} números copiados.`
        showNotification(msg, 'success')
      } catch {
        showNotification('Não foi possível copiar.', 'error')
      }
    },
    [showNotification]
  )

  const handleCopyRow = useCallback(
    (row) => {
      if (jmsColIndex < 0) {
        showNotification('Coluna "Número de pedido JMS" não encontrada.', 'error')
        return
      }
      const vals = row?.values || []
      const jms = vals[jmsColIndex]
      copyToClipboard(jms, 1)
    },
    [jmsColIndex, copyToClipboard, showNotification]
  )

  const handleCopyAll = useCallback(() => {
    if (jmsColIndex < 0) {
      showNotification('Coluna "Número de pedido JMS" não encontrada.', 'error')
      return
    }
    const all = data.map((row) => (row?.values || [])[jmsColIndex]).filter((v) => v != null && String(v).trim() !== '')
    copyToClipboard(all.join('\n'), all.length)
  }, [jmsColIndex, data, copyToClipboard, showNotification])

  const handleDownloadExcel = useCallback(() => {
    if (!header?.length || !data?.length) {
      showNotification('Sem dados para exportar.', 'error')
      return
    }
    try {
      const rows = [header, ...data.map((row) => row?.values ?? [])]
      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Não entregues')
      const safe = (s) => String(s ?? '').replace(/[\\/*?[\]:]/g, '-').trim() || 'export'
      const fileName = `nao-entregues-${safe(motorista)}-${safe(base)}.xlsx`
      XLSX.writeFile(wb, fileName)
      showNotification('Tabela exportada em Excel.', 'success')
    } catch (err) {
      showNotification('Não foi possível exportar o Excel.', 'error')
    }
  }, [header, data, motorista, base, showNotification])

  /** Copia todos os dados em texto formatado (apenas colunas selecionadas na config). */
  const handleCopyFormatted = useCallback(async () => {
    if (!header?.length || !data?.length) {
      showNotification('Sem dados para copiar.', 'error')
      return
    }
    const cols = columnsToCopy.length ? columnsToCopy : header
    const indices = cols.map((name) => header.indexOf(name)).filter((i) => i >= 0)
    const blocks = data.map((row) => {
      const vals = row?.values ?? []
      return indices.map((i) => `${header[i]}: ${vals[i] != null ? String(vals[i]) : ''}`).join('\n')
    })
    const text = blocks.join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      showNotification('Dados copiados (texto formatado).', 'success')
    } catch {
      showNotification('Não foi possível copiar.', 'error')
    }
  }, [header, data, columnsToCopy, showNotification])

  const fetchNaoEntregues = useCallback(async () => {
    if (!token || !motorista?.trim()) return
    setLoading(true)
    setError(null)
    try {
      let res
      if (tipo === 'entrada-galpao') {
        res = await getSLAEntradaGalpao(token, {
          motorista: motorista.trim(),
          base: (base || '(sem base)').trim(),
          datas,
          periodo,
          cidades,
        })
      } else if (tipo === 'entregues') {
        res = await getSLAEntregues(token, {
          motorista: motorista.trim(),
          base: (base || '(sem base)').trim(),
          datas,
          periodo,
          cidades,
        })
      } else {
        res = await getSLANaoEntregues(token, {
          motorista: motorista.trim(),
          base: (base || '(sem base)').trim(),
          datas,
          periodo,
          cidades,
        })
      }
      setData(res.data || [])
      setHeader(res.header || [])
    } catch (err) {
      const tipoMsg = tipo === 'entrada-galpao' ? 'entrada no galpão' : tipo === 'entregues' ? 'entregues' : 'não entregues'
      setError(err.message || `Erro ao carregar pedidos ${tipoMsg}.`)
      setData([])
      setHeader([])
    } finally {
      setLoading(false)
    }
  }, [token, motorista, base, datas, periodo, cidades, tipo])

  const fetchContato = useCallback(async () => {
    if (!token || !motorista?.trim()) return
    try {
      const res = await getContatoListaTelefones(token, motorista.trim(), (base || '(sem base)').trim())
      setTelefone(res.contato ?? '')
      setContatoDocId(res._id ?? null)
    } catch {
      setTelefone('')
      setContatoDocId(null)
    }
  }, [token, motorista, base])

  const handleSaveContato = useCallback(async () => {
    if (!token || !motorista?.trim()) return
    const formatted = formatarTelefoneComNove(telefone)
    const baseVal = (base || '(sem base)').trim()
    setSavingContato(true)
    try {
      if (contatoDocId) {
        await updateContatoListaTelefones(token, contatoDocId, formatted)
        setTelefone(formatted)
        setPhoneEditing(false)
        showNotification('Telefone atualizado.', 'success')
      } else {
        await upsertContatoListaTelefones(token, motorista.trim(), baseVal, formatted)
        setTelefone(formatted)
        setPhoneEditing(false)
        const res = await getContatoListaTelefones(token, motorista.trim(), baseVal)
        setContatoDocId(res._id ?? null)
        showNotification('Telefone guardado na lista de telefones.', 'success')
      }
    } catch (err) {
      showNotification(err.message || 'Não foi possível guardar o telefone.', 'error')
    } finally {
      setSavingContato(false)
    }
  }, [token, contatoDocId, motorista, base, telefone, showNotification])

  const handleOpenWhatsApp = useCallback(() => {
    const num = telefoneParaWhatsApp(telefone)
    if (!num) {
      showNotification('Informe o número de telefone para abrir o WhatsApp.', 'error')
      return
    }
    window.open(`https://wa.me/${num}`, '_blank', 'noopener,noreferrer')
  }, [telefone, showNotification])

  const handleOpenMensagemModal = useCallback(() => {
    const total = data?.length ?? 0
    const phSaudacao = getPlaceholderSaudacao()
    mensagemPlaceholderSaudacaoRef.current = phSaudacao
    const saved = typeof mensagemSalva === 'string' && mensagemSalva.trim()
    const usarSalva = saved && mensagemMantemPlaceholders(mensagemSalva.trim(), phSaudacao)
    const msg = usarSalva ? mensagemSalva.trim() : `Olá ${PLACEHOLDER_MOTORISTA}, ${phSaudacao} meu nome é ${PLACEHOLDER_USUARIO} e sou da torre de controle J&T express. Constam em aberto ${PLACEHOLDER_TOTAL} pedido${total !== 1 ? 's' : ''}. Você conseguirá finalizar hoje? Aguardo seu retorno. Atenciosamente, ${PLACEHOLDER_USUARIO}`
    setMensagemTexto(msg)
    setMensagemEditKey((k) => k + 1)
    setMensagemModalOpen(true)
  }, [data?.length, mensagemSalva])

  const handleMensagemTextoChange = useCallback(
    () => {
      const el = mensagemEditRef.current
      if (!el) return
      const next = el.innerText
      if (mensagemMantemPlaceholders(next, mensagemPlaceholderSaudacaoRef.current)) {
        /* Não atualizar state ao digitar para não perder o cursor; só corrigimos se inválido. */
      } else {
        /* Selecionou tudo e apagou: fica visível apenas o que não pode ser excluído (só os placeholders). */
        const apenasPlaceholders = getMensagemApenasPlaceholders(mensagemPlaceholderSaudacaoRef.current)
        setMensagemTexto(apenasPlaceholders)
        setMensagemEditKey((k) => k + 1)
        showNotification('Visível apenas o que não pode ser excluído (os campos entre parênteses).', 'info')
      }
    },
    [showNotification, totalPedidos]
  )

  const handleMensagemPaste = useCallback((e) => {
    e.preventDefault()
    const text = e.clipboardData?.getData('text/plain') ?? ''
    document.execCommand('insertText', false, text)
  }, [])

  const segmentosMensagem = useMemo(() => getSegmentosMensagem(mensagemTexto), [mensagemTexto])

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
      await updateConfig(token, { mensagem_sla_nao_entregues: text })
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
    const num = telefoneParaWhatsApp(telefone)
    if (!num) {
      showNotification('Informe o número de telefone para abrir o WhatsApp.', 'error')
      return
    }
    const final = getMensagemFinal()
    const text = encodeURIComponent(final)
    window.open(`https://wa.me/${num}?text=${text}`, '_blank', 'noopener,noreferrer')
  }, [telefone, getMensagemFinal, showNotification])

  const fetchRef = useRef(fetchNaoEntregues)
  fetchRef.current = fetchNaoEntregues

  useEffect(() => {
    if (open && token && motorista?.trim()) {
      fetchRef.current()
      // Só buscar contato para não entregues (para mensagem)
      if (tipo === 'nao-entregues') {
        fetchContato()
      }
    } else if (!open) {
      setData([])
      setHeader([])
      setError(null)
      setCopyMode('none')
      setSelectedRowId(null)
      setTelefone('')
      setConfigColunasOpen(false)
      setContatoDocId(null)
      setPhoneEditing(false)
      setMensagemModalOpen(false)
    }
  }, [open, token, motorista, tipo, fetchContato])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const displayBase = (base || '').trim() || '(sem base)'
  const displayMotorista = (motorista || '').trim() || '(sem motorista)'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sla-nao-entregues-overlay"
          className="sla-nao-entregues-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sla-nao-entregues-modal-title"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transition}
          onClick={onClose}
        >
          <motion.div
            className="sla-nao-entregues-modal"
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sla-nao-entregues-modal__header">
              <h2 id="sla-nao-entregues-modal-title" className="sla-nao-entregues-modal__title">
                <Logo jtColor="white" className="sla-nao-entregues-modal__title-logo" />
              </h2>
              <div className="sla-nao-entregues-modal__header-actions">
                <button type="button" className="sla-nao-entregues-modal__close" onClick={onClose} aria-label="Fechar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="sla-nao-entregues-modal__body">
              <section className="sla-nao-entregues-modal__section" aria-labelledby="sla-nao-entregues-resumo-title">
                <div className="sla-nao-entregues-modal__top-row">
                  <div className="sla-nao-entregues-modal__top-left">
                    <h3 id="sla-nao-entregues-resumo-title" className="sla-nao-entregues-modal__section-title">
                      {tipo === 'entrada-galpao' ? 'Pedidos entrada no galpão' : tipo === 'entregues' ? 'Pedidos entregues' : 'Pedidos não entregues'} — {displayMotorista}
                    </h3>
                    <div className="sla-nao-entregues-modal__base-bar">
                      <span className="sla-nao-entregues-modal__base-label">
                        Base: {displayBase}
                        {!loading && !error && (
                          <span className="sla-nao-entregues-modal__base-total">
                            — {data.length} pedido{data.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="sla-nao-entregues-modal__top-right">
                    <div className="sla-nao-entregues-modal__top-right-inner">
                      {tipo === 'nao-entregues' && (
                      <div className="sla-nao-entregues-modal__phone-wrap">
                        <input
                          id="sla-nao-entregues-phone"
                          type="tel"
                          className="sla-nao-entregues-modal__phone-input"
                          placeholder={contatoDocId ? 'Telefone' : 'Adicionar número (guardar na lista de telefones)'}
                          value={telefone}
                          onChange={(e) => setTelefone(e.target.value)}
                          readOnly={!!contatoDocId && !phoneEditing}
                          aria-label="Telefone"
                        />
                        {contatoDocId && !phoneEditing && (
                          <button
                            type="button"
                            className="sla-nao-entregues-modal__action-btn sla-nao-entregues-modal__phone-edit-btn"
                            title="Editar telefone"
                            aria-label="Editar telefone"
                            onClick={() => setPhoneEditing(true)}
                          >
                            <MdEdit className="sla-nao-entregues-modal__action-icon" aria-hidden />
                          </button>
                        )}
                        {(!contatoDocId || phoneEditing) && (
                          <button
                            type="button"
                            className="sla-nao-entregues-modal__action-btn sla-nao-entregues-modal__phone-save-btn"
                            title={contatoDocId ? 'Guardar telefone' : 'Guardar número na lista de telefones'}
                            aria-label={contatoDocId ? 'Guardar telefone' : 'Guardar número na lista de telefones'}
                            disabled={savingContato}
                            onClick={handleSaveContato}
                          >
                            <MdCheck className="sla-nao-entregues-modal__action-icon" aria-hidden />
                          </button>
                        )}
                      </div>
                      )}
                      <div className="sla-nao-entregues-modal__top-right-actions">
                        <button
                          type="button"
                          className="sla-nao-entregues-modal__action-btn"
                          title="Copiar todos os dados (texto formatado)"
                          aria-label="Copiar todos os dados (texto formatado)"
                          disabled={loading || !data?.length}
                          onClick={handleCopyFormatted}
                        >
                          <MdContentCopy className="sla-nao-entregues-modal__action-icon" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="sla-nao-entregues-modal__action-btn"
                          title="Descarregar tabela em Excel"
                          aria-label="Descarregar tabela em Excel"
                          disabled={loading || !data?.length}
                          onClick={handleDownloadExcel}
                        >
                          <MdDownload className="sla-nao-entregues-modal__action-icon" aria-hidden />
                        </button>
                        {tipo === 'nao-entregues' && (
                        <>
                        <button
                          type="button"
                          className="sla-nao-entregues-modal__action-btn"
                          title="Configurações — colunas a copiar"
                          aria-label="Configurações — colunas a copiar"
                          disabled={!header?.length}
                          onClick={openConfigColunas}
                        >
                          <MdSettings className="sla-nao-entregues-modal__action-icon" aria-hidden />
                        </button>
                        <button type="button" className="sla-nao-entregues-modal__action-btn" title="Escrever mensagem para envio" aria-label="Escrever mensagem para envio" onClick={handleOpenMensagemModal}>
                          <MdMessage className="sla-nao-entregues-modal__action-icon" aria-hidden />
                        </button>
                        <button type="button" className="sla-nao-entregues-modal__action-btn sla-nao-entregues-modal__action-btn--whatsapp" title="Abrir WhatsApp com este número" aria-label="Abrir WhatsApp com este número" onClick={handleOpenWhatsApp}>
                          <svg className="sla-nao-entregues-modal__action-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                            <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </button>
                        </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {loading && (
                  <p className="sla-nao-entregues-modal__loading">A carregar…</p>
                )}
                {error && (
                  <p className="sla-nao-entregues-modal__error" role="alert">{error}</p>
                )}
                {!loading && !error && data.length === 0 && (
                  <p className="sla-nao-entregues-modal__empty">
                    {tipo === 'entrada-galpao' ? 'Nenhum pedido entrada no galpão para este motorista nesta base.' :
                     tipo === 'entregues' ? 'Nenhum pedido entregue para este motorista nesta base.' :
                     'Nenhum pedido não entregue para este motorista nesta base.'}
                  </p>
                )}
                {!loading && !error && data.length > 0 && (
                  <div className="sla-nao-entregues-modal__table-wrap">
                    <table className="sla-nao-entregues-modal__table" role="grid">
                      <thead>
                        <tr>
                          <th scope="col" className="sla-nao-entregues-modal__th-copy">
                            <label className="sla-nao-entregues-modal__copy-label">
                              <input
                                type="checkbox"
                                className="sla-nao-entregues-modal__copy-checkbox"
                                checked={copyMode === 'all'}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCopyMode('all')
                                    setSelectedRowId(null)
                                    handleCopyAll()
                                  } else {
                                    setCopyMode('none')
                                    setSelectedRowId(null)
                                  }
                                }}
                                aria-label="Marcar para copiar todos os números de pedido JMS"
                              />
                            </label>
                          </th>
                          {header.map((label, i) => (
                            <th key={i} scope="col">{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row) => (
                          <tr key={row._id}>
                            <td className="sla-nao-entregues-modal__td-copy">
                              <label className="sla-nao-entregues-modal__copy-label">
                                <input
                                  type="checkbox"
                                  className="sla-nao-entregues-modal__copy-checkbox"
                                  checked={copyMode === 'all' || (copyMode === 'one' && row._id === selectedRowId)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCopyMode('one')
                                      setSelectedRowId(row._id)
                                      handleCopyRow(row)
                                    } else {
                                      if (copyMode === 'all') {
                                        setCopyMode('one')
                                        setSelectedRowId(row._id)
                                        handleCopyRow(row)
                                      } else {
                                        setCopyMode('none')
                                        setSelectedRowId(null)
                                      }
                                    }
                                  }}
                                  aria-label="Marcar para copiar número de pedido JMS desta linha"
                                />
                              </label>
                            </td>
                            {(row.values || []).map((cell, j) => (
                              <td key={j}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {open && mensagemModalOpen && (
          <motion.div
            className="sla-nao-entregues-modal-overlay sla-mensagem-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sla-mensagem-modal-title"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
            onClick={() => setMensagemModalOpen(false)}
          >
            <motion.div
              className="sla-nao-entregues-modal sla-mensagem-modal"
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sla-mensagem-modal__header">
                <h2 id="sla-mensagem-modal-title" className="sla-mensagem-modal__title">
                  Mensagem para envio
                </h2>
                <div className="sla-mensagem-modal__header-actions">
                  <button type="button" className="sla-mensagem-modal__close" onClick={() => setMensagemModalOpen(false)} aria-label="Fechar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="sla-mensagem-modal__body">
                <label className="sla-mensagem-modal__label" id="sla-mensagem-label">
                  Mensagem (pode editar; os textos entre parênteses não podem ser apagados):
                </label>
                <div
                  key={mensagemEditKey}
                  ref={mensagemEditRef}
                  id="sla-mensagem-texto"
                  className="sla-mensagem-modal__textarea sla-mensagem-modal__edit"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleMensagemTextoChange}
                  onPaste={handleMensagemPaste}
                  role="textbox"
                  aria-label="Mensagem para envio"
                  aria-labelledby="sla-mensagem-label"
                  data-placeholder="Digite a mensagem..."
                >
                  {segmentosMensagem.map((seg, i) =>
                    seg.type === 'placeholder' ? (
                      <span key={`${i}-${seg.value}`} className="sla-mensagem-placeholder" contentEditable={false} suppressContentEditableWarning>
                        {seg.value}
                      </span>
                    ) : (
                      seg.value
                    )
                  )}
                </div>
                <div className="sla-mensagem-modal__actions">
                  <button type="button" className="sla-mensagem-modal__btn sla-mensagem-modal__btn--save" onClick={handleGuardarMensagem} disabled={savingMensagem}>
                    {savingMensagem ? 'A guardar…' : 'Guardar no servidor'}
                  </button>
                  <button type="button" className="sla-mensagem-modal__btn sla-mensagem-modal__btn--copy" onClick={handleCopyMensagem}>
                    Copiar mensagem
                  </button>
                  <button type="button" className="sla-mensagem-modal__btn sla-mensagem-modal__btn--whatsapp" onClick={handleWhatsAppComMensagem}>
                    Abrir no WhatsApp
                  </button>
                  <button type="button" className="sla-mensagem-modal__btn sla-mensagem-modal__btn--secondary" onClick={() => setMensagemModalOpen(false)}>
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {open && configColunasOpen && header?.length > 0 && (
          <motion.div
            className="sla-nao-entregues-modal-overlay sla-mensagem-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sla-config-colunas-title"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
            onClick={() => setConfigColunasOpen(false)}
          >
            <motion.div
              className="sla-nao-entregues-modal sla-config-colunas-modal"
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sla-mensagem-modal__header">
                <h2 id="sla-config-colunas-title" className="sla-mensagem-modal__title">
                  Colunas a copiar
                </h2>
                <div className="sla-mensagem-modal__header-actions">
                  <button type="button" className="sla-mensagem-modal__close" onClick={() => setConfigColunasOpen(false)} aria-label="Fechar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="sla-config-colunas-body">
                <p className="sla-config-colunas-desc">
                  Selecione as colunas que o botão Copiar incluirá no texto formatado.
                </p>
                <div className="sla-config-colunas-list" role="group" aria-labelledby="sla-config-colunas-title">
                  {header.map((col) => (
                    <label key={col} className="sla-config-colunas-item">
                      <input
                        type="checkbox"
                        checked={configColunasSelection.includes(col)}
                        onChange={() => toggleConfigColuna(col)}
                        className="sla-config-colunas-checkbox"
                      />
                      <span className="sla-config-colunas-label">{col}</span>
                    </label>
                  ))}
                </div>
                <div className="sla-mensagem-modal__actions">
                  <button
                    type="button"
                    className="sla-mensagem-modal__btn sla-mensagem-modal__btn--save"
                    onClick={handleSaveConfigColunas}
                    disabled={savingConfigColunas || configColunasSelection.length === 0}
                  >
                    {savingConfigColunas ? 'A guardar…' : 'Guardar'}
                  </button>
                  <button type="button" className="sla-mensagem-modal__btn sla-mensagem-modal__btn--secondary" onClick={() => setConfigColunasOpen(false)}>
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  )
}
