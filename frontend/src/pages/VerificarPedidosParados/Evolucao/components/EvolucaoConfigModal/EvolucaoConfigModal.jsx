import { useState, useEffect, useRef } from 'react'
import { MdClose } from 'react-icons/md'
import { CHART_SECTIONS } from '../../evolucaoChartTheme.js'
import DateFilterSelect from '../../../../../components/DateFilterSelect'
import { getResultadosConsultaMotoristaDatas } from '../../../../../services'
import './EvolucaoConfigModal.css'

const CLOSE_DURATION_MS = 220

const TYPE_LABELS = {
  line: 'Linhas',
  bar: 'Barras',
  radar: 'Radar',
  doughnut: 'Rosca',
  pie: 'Pizza',
  polarArea: 'Área polar',
  bubble: 'Bolhas',
  scatter: 'Dispersão',
}

export default function EvolucaoConfigModal({
  open,
  onClose,
  token,
  selectedDatas = [],
  onDatasChange,
  chartConfig,
  onChartConfigChange,
  onRestoreDefault,
}) {
  const [isClosing, setIsClosing] = useState(false)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true
      setIsClosing(false)
      return
    }
    if (wasOpenRef.current) {
      setIsClosing(true)
    }
  }, [open])

  useEffect(() => {
    if (!isClosing) return
    const t = setTimeout(() => {
      setIsClosing(false)
      wasOpenRef.current = false
    }, CLOSE_DURATION_MS)
    return () => clearTimeout(t)
  }, [isClosing])

  const visible = open || isClosing
  if (!visible) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isClosing) onClose()
  }

  return (
    <div
      className={`evolucao__modal-backdrop${isClosing ? ' evolucao__modal-backdrop--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="evolucao-config-modal-title"
      onClick={handleBackdropClick}
    >
      <div className={`evolucao__modal evolucao__modal--config${isClosing ? ' evolucao__modal--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="evolucao__modal-header">
          <div className="evolucao__modal-header-text">
            <h2 id="evolucao-config-modal-title" className="evolucao__modal-title">
              Configuração
            </h2>
            <p className="evolucao__modal-subtitle">Data do envio e tipos de gráfico</p>
          </div>
          <button
            type="button"
            className="evolucao__modal-close"
            onClick={() => !isClosing && onClose()}
            aria-label="Fechar"
            disabled={isClosing}
          >
            <MdClose aria-hidden />
          </button>
        </div>
        <div className="evolucao__modal-body evolucao__modal-body--config">
          {token && (
            <div className="evolucao__config-date-wrap">
              <DateFilterSelect
                token={token}
                fetchDatas={() => getResultadosConsultaMotoristaDatas(token)}
                selectedDatas={selectedDatas}
                onChange={onDatasChange}
                label="Data do envio"
                disabled={false}
                className="evolucao__config-date-filter"
              />
            </div>
          )}
          <p className="evolucao__config-intro">
            A preferência é guardada no browser e aplicada em todas as secções da página Evolução.
          </p>
          <div className="evolucao__config-sections">
            {CHART_SECTIONS.map((sec) => (
              <div key={sec.id} className="evolucao__config-block">
                <label htmlFor={`evolucao-config-${sec.id}`} className="evolucao__config-label">
                  {sec.label}
                </label>
                <select
                  id={`evolucao-config-${sec.id}`}
                  className="evolucao__config-select"
                  value={chartConfig[sec.id]}
                  onChange={(e) => onChartConfigChange((prev) => ({ ...prev, [sec.id]: e.target.value }))}
                >
                  {sec.types.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t] ?? t}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="evolucao__config-actions">
            <button type="button" className="evolucao__btn-restore-config" onClick={onRestoreDefault}>
              Restaurar padrão
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
