/**
 * Tema e constantes partilhados pelos gráficos da página Evolução e pelo modal de estilos.
 * O design dos gráficos da página usa as mesmas opções base que os exemplos do modal.
 */

/** Cores dos dados da página (entregues, não entregues, outros) */
export const CHART_COLORS = {
  entregues: '#059669',
  naoEntregues: '#dc2626',
  outros: '#64748b',
}

/** Paleta do modal "Estilos de gráficos" – usada nos exemplos e como referência de design */
export const MODAL_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export const STORAGE_KEY_CHART_CONFIG = 'evolucao-chart-config'

export const DEFAULT_CHART_CONFIG = {
  comparativo: 'line',
  distribuicao: 'polarArea',
  performanceMotorista: 'bar',
  entreguesVsNao: 'line',
}

/** Mesmos 8 tipos do modal "Gráficos" – todas as secções podem usar qualquer um */
const ALL_CHART_TYPES = ['line', 'bar', 'radar', 'doughnut', 'pie', 'polarArea', 'bubble', 'scatter']

/** Tipos permitidos por secção (todas usam os mesmos 8 do modal) */
export const CHART_SECTIONS = [
  { id: 'comparativo', label: 'Comparativo (quantidade)', types: [...ALL_CHART_TYPES] },
  { id: 'distribuicao', label: 'Distribuição por status', types: [...ALL_CHART_TYPES] },
  { id: 'performanceMotorista', label: 'Performance por motorista', types: [...ALL_CHART_TYPES] },
  { id: 'entreguesVsNao', label: 'Entregues vs Não entregues', types: [...ALL_CHART_TYPES] },
]

/**
 * Opções padrão por tipo de gráfico (design do modal).
 * Usado nos exemplos do modal e como base nas secções da página.
 */
export function getDefaultChartOptions(type) {
  const common = { responsive: true, maintainAspectRatio: false }
  const legendBottom = {
    plugins: {
      legend: { position: 'bottom', labels: { color: '#0f172a', font: { size: 12 }, padding: 12 } },
    },
  }
  const scalesXY = {
    scales: {
      x: { display: true, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b', font: { size: 12 } } },
      y: { min: 0, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b', font: { size: 12 } } },
    },
  }

  switch (type) {
    case 'line':
      return { ...common, plugins: { legend: { display: false } }, ...scalesXY }
    case 'bar':
      return { ...common, plugins: { legend: { display: false } }, ...scalesXY }
    case 'radar':
      return { ...common, ...legendBottom, scales: { r: { beginAtZero: true } } }
    case 'doughnut':
    case 'pie':
      return { ...common, ...legendBottom }
    default:
      return { ...common, ...legendBottom }
  }
}

export function loadChartConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHART_CONFIG)
    if (!raw) return { ...DEFAULT_CHART_CONFIG }
    const parsed = JSON.parse(raw)
    return {
      comparativo: CHART_SECTIONS[0].types.includes(parsed.comparativo) ? parsed.comparativo : DEFAULT_CHART_CONFIG.comparativo,
      distribuicao: CHART_SECTIONS[1].types.includes(parsed.distribuicao) ? parsed.distribuicao : DEFAULT_CHART_CONFIG.distribuicao,
      performanceMotorista: CHART_SECTIONS[2].types.includes(parsed.performanceMotorista) ? parsed.performanceMotorista : DEFAULT_CHART_CONFIG.performanceMotorista,
      entreguesVsNao: CHART_SECTIONS[3].types.includes(parsed.entreguesVsNao) ? parsed.entreguesVsNao : DEFAULT_CHART_CONFIG.entreguesVsNao,
    }
  } catch {
    return { ...DEFAULT_CHART_CONFIG }
  }
}

/** Cores das barras no modal (igual ao gráfico real: entregues, não entregues, outros) */
const BAR_CHART_COLORS = [CHART_COLORS.entregues, CHART_COLORS.naoEntregues, CHART_COLORS.outros]

/** Dados de exemplo para o modal "Estilos de gráficos" – mesmo design que a página */
export function getModalChartSamples() {
  const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai']
  const data = [12, 19, 7, 15, 9]
  const cores = [...MODAL_PALETTE]
  const barLabels = ['Entregues', 'Não entregues', 'Outros']
  const barData = [12, 19, 7]
  return {
    line: {
      data: {
        labels,
        datasets: [
          {
            label: 'Série A',
            data,
            borderColor: cores[0],
            backgroundColor: 'rgba(59,130,246,0.1)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: getDefaultChartOptions('line'),
    },
    bar: {
      data: { labels: barLabels, datasets: [{ label: 'Pedidos', data: barData, backgroundColor: BAR_CHART_COLORS, borderRadius: 4, borderSkipped: false }] },
      options: getDefaultChartOptions('bar'),
    },
    radar: {
      data: {
        labels,
        datasets: [
          {
            label: 'Métrica',
            data,
            backgroundColor: 'rgba(59,130,246,0.2)',
            borderColor: '#3b82f6',
            pointBackgroundColor: '#3b82f6',
          },
        ],
      },
      options: getDefaultChartOptions('radar'),
    },
    doughnut: {
      data: { labels, datasets: [{ data, backgroundColor: cores, borderWidth: 0 }] },
      options: { ...getDefaultChartOptions('doughnut'), cutout: '55%' },
    },
    pie: {
      data: { labels, datasets: [{ data, backgroundColor: cores, borderWidth: 0 }] },
      options: getDefaultChartOptions('pie'),
    },
    polarArea: {
      data: {
        labels,
        datasets: [{ data, backgroundColor: cores.map((c) => c + '99'), borderWidth: 1, borderColor: cores }] },
      options: { ...getDefaultChartOptions('radar') },
    },
    bubble: {
      data: {
        datasets: [
          {
            label: 'Bubble',
            data: [
              { x: 10, y: 20, r: 5 },
              { x: 25, y: 30, r: 12 },
              { x: 40, y: 10, r: 8 },
              { x: 55, y: 35, r: 15 },
            ],
            backgroundColor: 'rgba(59,130,246,0.5)',
            borderColor: '#3b82f6',
          },
        ],
      },
      options: getDefaultChartOptions('line'),
    },
    scatter: {
      data: {
        datasets: [
          {
            label: 'Scatter',
            data: [
              { x: 5, y: 10 },
              { x: 15, y: 25 },
              { x: 30, y: 8 },
              { x: 45, y: 40 },
            ],
            backgroundColor: '#3b82f6',
            borderColor: '#3b82f6',
          },
        ],
      },
      options: getDefaultChartOptions('line'),
    },
  }
}
