import { Chart } from 'react-chartjs-2'
import 'chart.js/auto'
import './EvolucaoChartSection.css'

export default function EvolucaoChartSection({
  title,
  type,
  data,
  options,
  height = 280,
  emptyMessage = 'Sem dados para exibir',
  hasData,
  wrapClassName = '',
}) {
  return (
    <div className="evolucao__chart-section">
      <h2 className="evolucao__chart-title">{title}</h2>
      {hasData ? (
        <div className={`evolucao__chart-wrap ${wrapClassName}`.trim()} style={{ height }}>
          <Chart key={`${title}-${type}`} type={type} data={data} options={options} />
        </div>
      ) : (
        <p className="evolucao__chart-empty">{emptyMessage}</p>
      )}
    </div>
  )
}
