import React from 'react'
import './SLAPercentCell.css'

const TIPOS = ['texto', 'circular', 'vertical', 'horizontal']

/**
 * Extrai o número da percentagem a partir do value (ex: "85.5%" ou 85.5).
 */
function parsePercent(value) {
  if (value == null) return 0
  const s = String(value).replace(/%/g, '').trim()
  const n = parseFloat(s)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0
}

/**
 * Célula da coluna % SLA com 4 tipos de acompanhamento:
 * texto | circular | vertical | horizontal
 */
export default function SLAPercentCell({ value, type = 'texto' }) {
  const pct = parsePercent(value)
  const displayType = TIPOS.includes(type) ? type : 'texto'

  if (displayType === 'texto') {
    return <span className="sla-pct-cell sla-pct-cell--texto">{pct.toFixed(1)}%</span>
  }

  if (displayType === 'circular') {
    const r = 18
    const circumference = 2 * Math.PI * r
    const strokeDashoffset = circumference - (pct / 100) * circumference
    return (
      <div className="sla-pct-cell sla-pct-cell--circular" title={`${pct.toFixed(1)}%`}>
        <svg className="sla-pct-cell__svg" viewBox="0 0 44 44" width={44} height={44}>
          <circle
            className="sla-pct-cell__circle-bg"
            cx="22"
            cy="22"
            r={r}
            fill="none"
            strokeWidth="4"
          />
          <circle
            className="sla-pct-cell__circle-fill"
            cx="22"
            cy="22"
            r={r}
            fill="none"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 22 22)"
          />
        </svg>
        <span className="sla-pct-cell__label">{pct.toFixed(0)}%</span>
      </div>
    )
  }

  if (displayType === 'vertical') {
    return (
      <div className="sla-pct-cell sla-pct-cell--vertical" title={`${pct.toFixed(1)}%`}>
        <div className="sla-pct-cell__track">
          <div className="sla-pct-cell__fill" style={{ height: `${pct}%` }} />
        </div>
        <span className="sla-pct-cell__label">{pct.toFixed(0)}%</span>
      </div>
    )
  }

  if (displayType === 'horizontal') {
    return (
      <div className="sla-pct-cell sla-pct-cell--horizontal" title={`${pct.toFixed(1)}%`}>
        <div className="sla-pct-cell__track">
          <div className="sla-pct-cell__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="sla-pct-cell__label">{pct.toFixed(0)}%</span>
      </div>
    )
  }

  return <span className="sla-pct-cell sla-pct-cell--texto">{pct.toFixed(1)}%</span>
}

export { parsePercent, TIPOS }
