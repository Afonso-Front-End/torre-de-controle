/**
 * Modal com a performance da base de entrega.
 * Abre ao clicar na célula da coluna "Base de entrega" na tabela SLA.
 */
import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { overlayVariants, modalContentVariants, transition } from '../../../../utils/animations'
import { getSLAIndicadores } from '../../../../services'
import { getTodayDateString } from '../../hooks/useSLATabela'
import './SLAPerformanceModal.css'

const RING_R = 42

export default function SLAPerformanceModal({ open, onClose, base, token, cidades = [] }) {
  const [baseData, setBaseData] = useState(null)
  const [porMotorista, setPorMotorista] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchPerformance = useCallback(async () => {
    if (!token || !base?.trim()) {
      setBaseData(null)
      setPorMotorista([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    setBaseData(null)
    setPorMotorista([])
    try {
      const datasParam = [getTodayDateString()]
      const cidadesParam = Array.isArray(cidades) && cidades.length > 0 ? cidades : null
      const res = await getSLAIndicadores(token, datasParam, [base.trim()], null, cidadesParam)
      const porBaseList = res.porBase || []
      const found = porBaseList.find((b) => (b.nome || '').trim() === base.trim())
      setBaseData(found || null)
      setPorMotorista(res.porMotorista || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar performance.')
    } finally {
      setLoading(false)
    }
  }, [token, base, cidades])

  useEffect(() => {
    if (open && base?.trim()) fetchPerformance()
  }, [open, base, fetchPerformance])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const baseTrim = base?.trim() || ''

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sla-performance-modal-overlay"
          className="sla-performance-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sla-performance-modal-title"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transition}
          onClick={onClose}
        >
          <motion.div
            className={`sla-performance-modal ${porMotorista.length > 0 ? 'sla-performance-modal--with-table' : ''}`}
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sla-performance-modal__header">
              <h2 id="sla-performance-modal-title" className="sla-performance-modal__title">
                Performance da base
              </h2>
              <button type="button" className="sla-performance-modal__close" onClick={onClose} aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="sla-performance-modal__body">
              {Array.isArray(cidades) && cidades.length > 0 && (
                <p className="sla-performance-modal__cidades-label" aria-live="polite">
                  Conforme cidades selecionadas: {cidades.join(', ')}
                </p>
              )}
              {!baseTrim ? (
                <p className="sla__layout-card-empty">Nenhuma base selecionada.</p>
              ) : loading ? (
                <p className="sla__loading-text">A carregar dados de {baseTrim}…</p>
              ) : error ? (
                <p className="sla__layout-card-empty">{error}</p>
              ) : !baseData ? (
                <p className="sla__layout-card-empty">Sem dados de performance para &quot;{baseTrim}&quot;.</p>
              ) : (
                <>
                  <PerformanceCard baseData={baseData} />
                  {porMotorista.length > 0 && (
                    <section className="sla-performance-modal__table-section" aria-labelledby="sla-performance-modal-table-title">
                      <h3 id="sla-performance-modal-table-title" className="sla-performance-modal__table-title">
                        Por motorista ({porMotorista.length})
                      </h3>
                      <div className="sla-performance-modal__table-wrap">
                        <table className="sla-performance-modal__table" role="grid">
                          <thead>
                            <tr>
                              <th scope="col" className="sla-performance-modal__th-motorista">Motorista</th>
                              <th scope="col" className="sla-performance-modal__th-center">Total entregues</th>
                              <th scope="col" className="sla-performance-modal__th-center">Não entregues</th>
                              <th scope="col" className="sla-performance-modal__th-center">Total</th>
                              <th scope="col" className="sla-performance-modal__th-center">% SLA</th>
                              <th scope="col" className="sla-performance-modal__th-cidades">Cidades</th>
                            </tr>
                          </thead>
                          <tbody>
                            {porMotorista.map((m, i) => (
                              <tr key={m.nome ?? i}>
                                <td className="sla-performance-modal__table-nome">{m.nome ?? '—'}</td>
                                <td className="sla-performance-modal__table-num sla-performance-modal__table-cell--center">{m.totalEntregues ?? 0}</td>
                                <td className="sla-performance-modal__table-num sla-performance-modal__table-cell--center">{m.naoEntregues ?? 0}</td>
                                <td className="sla-performance-modal__table-num sla-performance-modal__table-cell--center">{m.total ?? 0}</td>
                                <td className="sla-performance-modal__table-cell--center">
                                  <span className={`sla-performance-modal__table-pct sla-performance-modal__table-pct--${pctClass(m.percentualSla)}`}>
                                    {m.percentualSla != null ? `${m.percentualSla}%` : '—'}
                                  </span>
                                </td>
                                <td className="sla-performance-modal__table-cidades">
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

function PerformanceCard({ baseData }) {
  const pct = Math.min(100, Math.max(0, Number(baseData.percentualSla) ?? 0))
  const pctClass = pct >= 90 ? 'sla__layout-pct--ok' : pct >= 70 ? 'sla__layout-pct--medio' : 'sla__layout-pct--baixo'
  const ringColor = pct >= 90 ? '#059669' : pct >= 70 ? '#F7941D' : '#dc2626'
  const circumference = 2 * Math.PI * RING_R
  const strokeDashoffset = circumference - (pct / 100) * circumference

  return (
    <div className="sla__layout-card sla__layout-card--page sla-performance-modal__card" aria-label="Performance da base">
      <div className="sla__layout-card-inner">
        <div className={`sla__layout-card-ring ${pctClass}`} aria-hidden>
          <svg className="sla__layout-card-ring-svg" viewBox="0 0 100 100" aria-hidden>
            <circle className="sla__layout-card-ring-track" cx="50" cy="50" r={RING_R} fill="none" strokeWidth="8" />
            <circle
              className="sla__layout-card-ring-fill"
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              strokeWidth="8"
              stroke={ringColor}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <span className="sla__layout-card-ring-pct" aria-label={`${pct}% SLA`}>
            <span className="sla__layout-card-ring-pct-num">{pct}</span>
            <span className="sla__layout-card-ring-pct-sym">%</span>
          </span>
        </div>
        <h3 className="sla__layout-card-title">{baseData.nome}</h3>
        <div className="sla__layout-card-metrics">
          <div className="sla__layout-card-metric">
            <span className="sla__layout-card-label">Entregues</span>
            <span className="sla__layout-card-value">{baseData.totalEntregues ?? 0}</span>
          </div>
          <div className="sla__layout-card-metric">
            <span className="sla__layout-card-label">Não entregues</span>
            <span className="sla__layout-card-value">{baseData.naoEntregues ?? 0}</span>
          </div>
        </div>
        <span className={`sla__layout-card-pct-label ${pctClass}`}>SLA</span>
      </div>
    </div>
  )
}

function pctClass(pct) {
  const n = Number(pct)
  if (n >= 90) return 'ok'
  if (n >= 70) return 'medio'
  return 'baixo'
}
