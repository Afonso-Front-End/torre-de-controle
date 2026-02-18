import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { overlayVariants, modalContentVariants, transition } from '../../../../utils/animations'
import './SLAConfigModal.css'

/**
 * Modal de config: escolher quais bases de entrega acompanhar no SLA.
 * As bases selecionadas são salvas em user.config.bases_sla e aparecem no filtro de Base de entrega.
 * Se nada estiver marcado, a tabela mostra todas as bases.
 */
export default function SLAConfigModal({ open, onClose, allBases = [], savedBases = [], onSave, saving = false, loadingBases = false }) {
  const [tempSelected, setTempSelected] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) {
      setTempSelected(Array.isArray(savedBases) ? [...savedBases] : [])
      setSearch('')
    }
  }, [open, savedBases])

  const toggle = useCallback((base) => {
    setTempSelected((prev) => {
      const set = new Set(prev)
      if (set.has(base)) set.delete(base)
      else set.add(base)
      return [...set].sort()
    })
  }, [])

  const selectAll = useCallback(() => {
    setTempSelected([...allBases].sort())
  }, [allBases])

  const clearAll = useCallback(() => {
    setTempSelected([])
  }, [])

  const handleSave = () => {
    onSave(tempSelected)
    onClose()
  }

  const filteredBases = search.trim()
    ? allBases.filter((b) => b.toLowerCase().includes(search.trim().toLowerCase()))
    : allBases

  const allSelected = allBases.length > 0 && tempSelected.length === allBases.length
  const noneSelected = tempSelected.length === 0

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sla-config-modal-overlay"
          className="sla-config-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sla-config-modal-title"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transition}
          onClick={onClose}
        >
          <motion.div
            className="sla-config-modal"
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
            onClick={(e) => e.stopPropagation()}
          >
        <div className="sla-config-modal__header">
          <h2 id="sla-config-modal-title" className="sla-config-modal__title">
            Bases de entrega
          </h2>
          <button type="button" className="sla-config-modal__close" onClick={onClose} aria-label="Fechar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="sla-config-modal__desc">
          Escolha as bases que quer acompanhar. A tabela e o filtro mostrarão apenas essas bases; se nenhuma estiver marcada, todas serão exibidas.
        </p>
        <div className="sla-config-modal__body">
          {loadingBases ? (
            <div className="sla-config-modal__state">
              <div className="sla-config-modal__spinner" aria-hidden />
              <p className="sla-config-modal__state-text">A carregar bases…</p>
            </div>
          ) : allBases.length === 0 ? (
            <div className="sla-config-modal__state">
              <p className="sla-config-modal__state-text">Importe dados na página SLA para listar as bases disponíveis.</p>
            </div>
          ) : (
            <>
              <div className="sla-config-modal__toolbar">
                <input
                  type="search"
                  className="sla-config-modal__search"
                  placeholder="Pesquisar base…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={saving}
                  aria-label="Pesquisar base"
                />
                <div className="sla-config-modal__actions">
                  <button
                    type="button"
                    className="sla-config-modal__link"
                    onClick={selectAll}
                    disabled={saving || allSelected}
                  >
                    Selecionar todas
                  </button>
                  <span className="sla-config-modal__sep">·</span>
                  <button
                    type="button"
                    className="sla-config-modal__link"
                    onClick={clearAll}
                    disabled={saving || noneSelected}
                  >
                    Desmarcar todas
                  </button>
                </div>
              </div>
              <p className="sla-config-modal__count" aria-live="polite">
                {tempSelected.length} de {allBases.length} selecionada{tempSelected.length !== 1 ? 's' : ''}
              </p>
              <div className="sla-config-modal__list-wrap">
                <ul className="sla-config-modal__list" role="group" aria-label="Bases de entrega">
                  {filteredBases.length === 0 ? (
                    <li className="sla-config-modal__empty-item">Nenhuma base corresponde à pesquisa.</li>
                  ) : (
                    filteredBases.map((base) => {
                      const checked = tempSelected.includes(base)
                      return (
                        <li key={base} className="sla-config-modal__item">
                          <label className="sla-config-modal__label">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(base)}
                              disabled={saving}
                              className="sla-config-modal__input"
                            />
                            <span className="sla-config-modal__label-text">{base}</span>
                          </label>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
        <div className="sla-config-modal__footer">
          <button type="button" className="sla-config-modal__btn-cancel" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="button"
            className="sla-config-modal__btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
