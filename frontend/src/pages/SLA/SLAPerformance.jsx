import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAppContext } from '../../context'
import { getSLAIndicadores } from '../../services'
import { getTodayDateString } from './hooks/useSLATabela'
import './css/sla.css'

const RING_R = 42

export default function SLAPerformance() {
  const [searchParams] = useSearchParams()
  const baseFromUrl = searchParams.get('base')?.trim() || null
  const { user } = useAppContext()
  const token = user?.token

  const [baseData, setBaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPerformance = useCallback(async () => {
    if (!token || !baseFromUrl) {
      setLoading(false)
      setBaseData(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const datasParam = [getTodayDateString()]
      const res = await getSLAIndicadores(token, datasParam, [baseFromUrl], null)
      const porBase = res.porBase || []
      const found = porBase.find((b) => (b.nome || '').trim() === baseFromUrl)
      setBaseData(found || null)
    } catch (err) {
      setError(err.message || 'Erro ao carregar performance.')
      setBaseData(null)
    } finally {
      setLoading(false)
    }
  }, [token, baseFromUrl])

  useEffect(() => {
    fetchPerformance()
  }, [fetchPerformance])

  if (!baseFromUrl) {
    return (
      <div className="sla sla--performance-page">
        <div className="sla__performance-inner">
          <p className="sla__layout-card-empty">
            Selecione uma base no filtro da coluna Base de entrega na{' '}
            <Link to="/sla">página SLA</Link> e clique numa linha para ver a performance.
          </p>
          <Link to="/sla" className="sla__performance-back">
            ← Voltar à tabela SLA
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="sla sla--performance-page">
        <div className="sla__performance-inner">
          <p className="sla__loading-text">A carregar dados de {baseFromUrl}…</p>
          <Link to="/sla" className="sla__performance-back">
            ← Voltar à tabela SLA
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sla sla--performance-page">
        <div className="sla__performance-inner">
          <p className="sla__layout-card-empty">{error}</p>
          <Link to="/sla" className="sla__performance-back">
            ← Voltar à tabela SLA
          </Link>
        </div>
      </div>
    )
  }

  if (!baseData) {
    return (
      <div className="sla sla--performance-page">
        <div className="sla__performance-inner">
          <p className="sla__layout-card-empty">
            Sem dados de performance para &quot;{baseFromUrl}&quot;.
          </p>
          <Link to="/sla" className="sla__performance-back">
            ← Voltar à tabela SLA
          </Link>
        </div>
      </div>
    )
  }

  const pct = Math.min(100, Math.max(0, Number(baseData.percentualSla) ?? 0))
  const pctClass = pct >= 90 ? 'sla__layout-pct--ok' : pct >= 70 ? 'sla__layout-pct--medio' : 'sla__layout-pct--baixo'
  const ringColor = pct >= 90 ? '#059669' : pct >= 70 ? '#F7941D' : '#dc2626'
  const circumference = 2 * Math.PI * RING_R
  const strokeDashoffset = circumference - (pct / 100) * circumference

  return (
    <div className="sla sla--performance-page">
      <div className="sla__performance-inner">
        <Link to="/sla" className="sla__performance-back">
          ← Voltar à tabela SLA
        </Link>
        <div className="sla__layout-card sla__layout-card--page" aria-label="Performance da base">
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
            <h1 className="sla__layout-card-title">{baseData.nome}</h1>
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
      </div>
    </div>
  )
}
