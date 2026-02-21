/**
 * Hook: estado dos modais e do dropdown de filtro por cidades (aberto/fechado, refs, click outside).
 */
import { useState, useRef, useEffect } from 'react'

export default function useSLAModals() {
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [acompanhamentoModalOpen, setAcompanhamentoModalOpen] = useState(false)
  const [dadosModalOpen, setDadosModalOpen] = useState(false)
  const [naoEntreguesModalOpen, setNaoEntreguesModalOpen] = useState(false)
  const [naoEntreguesModalMotorista, setNaoEntreguesModalMotorista] = useState('')
  const [naoEntreguesModalBase, setNaoEntreguesModalBase] = useState('')
  const [naoEntreguesModalTipo, setNaoEntreguesModalTipo] = useState('nao-entregues')
  const [cidadesFilterOpen, setCidadesFilterOpen] = useState(false)
  const [cidadesFilterSearchTerm, setCidadesFilterSearchTerm] = useState('')
  const [cidadesFilterAnchorRect, setCidadesFilterAnchorRect] = useState(null)

  const cidadesFilterRef = useRef(null)
  const cidadesFilterBtnRef = useRef(null)

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

  const closeNaoEntreguesModal = () => {
    setNaoEntreguesModalOpen(false)
    setNaoEntreguesModalMotorista('')
    setNaoEntreguesModalBase('')
    setNaoEntreguesModalTipo('nao-entregues')
  }

  return {
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
    closeNaoEntreguesModal,
    cidadesFilterOpen,
    setCidadesFilterOpen,
    cidadesFilterSearchTerm,
    setCidadesFilterSearchTerm,
    cidadesFilterAnchorRect,
    setCidadesFilterAnchorRect,
    cidadesFilterRef,
    cidadesFilterBtnRef,
  }
}
