import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Chart } from 'react-chartjs-2'
import { MdClose } from 'react-icons/md'
import 'chart.js/auto'
import { getModalChartSamples } from '../../evolucaoChartTheme.js'
import { overlayVariants, modalContentVariants, transition } from '../../../../../utils/animations'
import './EvolucaoChartStylesModal.css'

const CHART_TYPES = ['line', 'bar', 'radar', 'doughnut', 'pie', 'polarArea', 'bubble', 'scatter']

const CHART_TYPE_LABELS = {
  line: 'Linhas',
  bar: 'Barras',
  radar: 'Radar',
  doughnut: 'Rosca',
  pie: 'Pizza',
  polarArea: 'Área polar',
  bubble: 'Bolhas',
  scatter: 'Dispersão',
}

export default function EvolucaoChartStylesModal({ open, onClose }) {
  const samples = useMemo(() => getModalChartSamples(), [])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="evolucao-charts-modal"
          className="evolucao__modal-backdrop evolucao__modal-backdrop--charts"
          role="dialog"
          aria-modal="true"
          aria-labelledby="evolucao-modal-title"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transition}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="evolucao__modal evolucao__modal--charts"
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="evolucao__modal-header">
              <div className="evolucao__modal-header-text">
                <h2 id="evolucao-modal-title" className="evolucao__modal-title">
                  Estilos de gráficos
                </h2>
                <p className="evolucao__modal-subtitle">Tipos disponíveis para cada secção da página Evolução</p>
              </div>
              <button type="button" className="evolucao__modal-close" onClick={onClose} aria-label="Fechar">
                <MdClose aria-hidden />
              </button>
            </div>
            <div className="evolucao__modal-body evolucao__modal-body--charts">
              {CHART_TYPES.map((tipo) => {
                const sample = samples[tipo]
                if (!sample) return null
                return (
                  <article key={tipo} className="evolucao__modal-chart">
                    <h3 className="evolucao__modal-chart-label">{CHART_TYPE_LABELS[tipo] ?? tipo}</h3>
                    <div className="evolucao__modal-chart-wrap">
                      <Chart type={tipo} data={sample.data} options={sample.options} />
                    </div>
                  </article>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
