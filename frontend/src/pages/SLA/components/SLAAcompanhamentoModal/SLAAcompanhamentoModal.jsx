import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { overlayVariants, modalContentVariants, transition } from '../../../../utils/animations'
import SLAPercentCell from '../SLAPercentCell'
import './SLAAcompanhamentoModal.css'

const OPCOES = [
  { tipo: 'texto', label: 'Texto', desc: 'Apenas a percentagem em texto' },
  { tipo: 'circular', label: 'Progresso circular', desc: 'Círculo com a percentagem no centro' },
  { tipo: 'vertical', label: 'Progresso vertical', desc: 'Barra vertical' },
  { tipo: 'horizontal', label: 'Progresso horizontal', desc: 'Barra horizontal' },
]

const PREVIEW_PCT = 75

/**
 * Modal para escolher o tipo de acompanhamento da coluna % SLA (texto, circular, vertical, horizontal).
 */
export default function SLAAcompanhamentoModal({ open, onClose, tipoAtual = 'texto', onSelect, saving = false }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const handleSelect = (tipo) => {
    if (saving) return
    onSelect?.(tipo)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sla-acompanhamento-modal-overlay"
          className="sla-acompanhamento-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sla-acompanhamento-modal-title"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transition}
          onClick={onClose}
        >
          <motion.div
            className="sla-acompanhamento-modal"
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sla-acompanhamento-modal__header">
              <h2 id="sla-acompanhamento-modal-title" className="sla-acompanhamento-modal__title">
                Tipo de acompanhamento (% SLA)
              </h2>
              <button type="button" className="sla-acompanhamento-modal__close" onClick={onClose} aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="sla-acompanhamento-modal__desc">
              Escolha como deseja visualizar a percentagem SLA na tabela.
            </p>
            <div className="sla-acompanhamento-modal__body">
              <ul className="sla-acompanhamento-modal__list" role="radiogroup" aria-label="Tipos de acompanhamento">
                {OPCOES.map(({ tipo, label, desc }) => (
                  <li key={tipo} className="sla-acompanhamento-modal__item">
                    <button
                      type="button"
                      className={`sla-acompanhamento-modal__card${tipoAtual === tipo ? ' sla-acompanhamento-modal__card--selected' : ''}`}
                      onClick={() => handleSelect(tipo)}
                      disabled={saving}
                      aria-pressed={tipoAtual === tipo}
                      aria-label={`${label}: ${desc}`}
                    >
                      <span className="sla-acompanhamento-modal__card-label">{label}</span>
                      <span className="sla-acompanhamento-modal__card-preview">
                        <SLAPercentCell value={`${PREVIEW_PCT}%`} type={tipo} />
                      </span>
                      <span className="sla-acompanhamento-modal__card-desc">{desc}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
