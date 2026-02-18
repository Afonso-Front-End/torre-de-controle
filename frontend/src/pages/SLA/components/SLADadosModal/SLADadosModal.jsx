/**
 * Modal com resumo completo dos dados SLA.
 * Exibe os dados conforme os filtros aplicados na tabela (base de entrega, cidade, etc.).
 */
import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { overlayVariants, modalContentVariants, transition } from '../../../../utils/animations'
import SLAPercentCell from '../SLAPercentCell'
import ModalCaptureButton from './ModalCaptureButton'
import './SLADadosModal.css'

export default function SLADadosModal({ 
  open, 
  onClose, 
  header = [], 
  porBase = [], 
  porMotorista = [], 
  selectedCidades = [], 
  tipoAcompanhamento = 'texto' 
}) {
  const modalRef = useRef(null)

  // Fecha com ESC
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  /** Tabela sempre ordenada por % SLA mais alta primeiro */
  const porBaseOrdenado = useMemo(
    () => [...porBase].sort((a, b) => (Number(b.percentualSla) ?? 0) - (Number(a.percentualSla) ?? 0)),
    [porBase]
  )
  const porMotoristaOrdenado = useMemo(
    () => [...porMotorista].sort((a, b) => (Number(b.percentualSla) ?? 0) - (Number(a.percentualSla) ?? 0)),
    [porMotorista]
  )

  const hasBase = porBaseOrdenado.length > 0
  const hasMotoristas = porMotoristaOrdenado.length > 0

  // --- MELHORIA: Geração Dinâmica do Nome do Arquivo ---
  const downloadFilename = useMemo(() => {
    const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
    let prefixo = 'SLA-Geral'

    // Se tiver dados por base, usa o nome da primeira base (mais relevante)
    if (hasBase) {
      const nomeBase = porBaseOrdenado[0]?.nome || 'Base'
      // Remove caracteres especiais e espaços para evitar erros no arquivo
      const nomeLimpo = nomeBase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')
      prefixo = `SLA-${nomeLimpo}`
    } else if (hasMotoristas) {
      prefixo = 'SLA-Motoristas'
    }

    return `${prefixo}-${hoje}`
  }, [hasBase, porBaseOrdenado, hasMotoristas])
  // -----------------------------------------------------

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sla-dados-modal-overlay"
          className="sla-dados-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sla-dados-modal-title"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transition}
          onClick={onClose}
        >
          <motion.div
            ref={modalRef}
            className="sla-dados-modal"
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sla-dados-modal__header">
              <h2 id="sla-dados-modal-title" className="sla-dados-modal__title">
                <span className="sla-dados-modal__logo-jt">J&T</span>
                <span className="sla-dados-modal__logo-express"> EXPRESS</span>
              </h2>
              <div className="sla-dados-modal__header-actions">
                {/* Botão atualizado com nome de arquivo dinâmico */}
                <ModalCaptureButton 
                  targetRef={modalRef} 
                  downloadFilename={downloadFilename} 
                />
                
                <button type="button" className="sla-dados-modal__close" onClick={onClose} aria-label="Fechar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="sla-dados-modal__body">
              {!hasBase && !hasMotoristas ? (
                <p className="sla-dados-modal__empty">Nenhum dado disponível para o filtro selecionado.</p>
              ) : (
                <>
                  {hasBase && (
                    <section className="sla-dados-modal__section sla-dados-modal__section--base" aria-labelledby="sla-dados-resumo-title">
                      <h3 id="sla-dados-resumo-title" className="sla-dados-modal__section-title">
                        Performance {porBaseOrdenado[0]?.nome ?? ''}
                      </h3>
                      <div className="sla-dados-modal__base-wrap">
                        <table className="sla-dados-modal__base-table" role="grid">
                          <thead>
                            <tr>
                              <th scope="col">Base</th>
                              <th scope="col">Total entregues</th>
                              <th scope="col">Não entregues</th>
                              <th scope="col">Total</th>
                              <th scope="col">% SLA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {porBaseOrdenado.map((b, i) => (
                              <tr key={b.nome ?? i}>
                                <td>{b.nome ?? '—'}</td>
                                <td className="sla-dados-modal__base-num">{b.totalEntregues ?? 0}</td>
                                <td className="sla-dados-modal__base-num">{b.naoEntregues ?? 0}</td>
                                <td className="sla-dados-modal__base-num">{b.total ?? 0}</td>
                                <td>
                                  <span className={`sla-dados-modal__pct-wrap sla-dados-modal__pct-wrap--${pctClass(b.percentualSla)}`}>
                                    <SLAPercentCell value={b.percentualSla != null ? `${b.percentualSla}%` : '0%'} type={tipoAcompanhamento} />
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {hasMotoristas && (
                    <section className="sla-dados-modal__section sla-dados-modal__section--motoristas" aria-labelledby="sla-dados-motoristas-title">
                      <h3 id="sla-dados-motoristas-title" className="sla-dados-modal__section-title">
                        Detalhe por motorista
                      </h3>
                      <div className="sla-dados-modal__motoristas-wrap sla-dados-modal__motoristas-wrap--scroll">
                        <table className="sla-dados-modal__motoristas-table" role="grid">
                          <thead>
                            <tr>
                              <th scope="col">{header[0] || 'Motorista'}</th>
                              <th scope="col">{header[1] || 'Base de entrega'}</th>
                              <th scope="col">{header[2] || 'Total entregues'}</th>
                              <th scope="col">{header[3] || 'Não entregues'}</th>
                              <th scope="col">{header[4] || 'Total'}</th>
                              <th scope="col">{header[5] || '% SLA'}</th>
                              <th scope="col">Cidades</th>
                            </tr>
                          </thead>
                          <tbody>
                            {porMotoristaOrdenado.map((m, i) => (
                              <tr key={m.nome ?? i}>
                                <td className="sla-dados-modal__motoristas-nome">{m.nome ?? '—'}</td>
                                <td>{m.base ?? '—'}</td>
                                <td className="sla-dados-modal__motoristas-num">{m.totalEntregues ?? 0}</td>
                                <td className="sla-dados-modal__motoristas-num">{m.naoEntregues ?? 0}</td>
                                <td className="sla-dados-modal__motoristas-num">{m.total ?? 0}</td>
                                <td>
                                  <span className={`sla-dados-modal__pct-wrap sla-dados-modal__pct-wrap--${pctClass(m.percentualSla)}`}>
                                    <SLAPercentCell value={m.percentualSla != null ? `${m.percentualSla}%` : '0%'} type={tipoAcompanhamento} />
                                  </span>
                                </td>
                                <td className="sla-dados-modal__motoristas-cidades">
                                  {Array.isArray(m.cidades) && m.cidades.length > 0 ? m.cidades.join(', ') : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function pctClass(pct) {
  const n = Number(pct)
  if (n >= 90) return 'ok'
  if (n >= 70) return 'medio'
  return 'baixo'
}