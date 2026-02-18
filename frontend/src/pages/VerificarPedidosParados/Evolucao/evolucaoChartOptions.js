/**
 * Opções e dados dos gráficos por secção e tipo.
 * Dados e opções no mesmo formato do modal para o aspeto ser idêntico.
 */

import { getDefaultChartOptions, getModalChartSamples, MODAL_PALETTE, CHART_COLORS } from './evolucaoChartTheme.js'

/**
 * Converte cor hex para rgba com alpha.
 */
function hexToRgba(hex, alpha = 1) {
  if (typeof hex !== 'string') return `rgba(59,130,246,${alpha})`
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return `rgba(59,130,246,${alpha})`
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * Adapta os dados da secção ao formato do modal para o tipo escolhido,
 * para o gráfico na página ficar visualmente igual ao do modal.
 */
export function getChartDataForSectionType(sectionId, type, barChartJs, pieChartJs, motoristaBarChartJs, lineChartJs) {
  const getSectionData = () => {
    if (sectionId === 'comparativo') return barChartJs?.data
    if (sectionId === 'distribuicao') return pieChartJs?.data
    if (sectionId === 'performanceMotorista') return motoristaBarChartJs?.data
    if (sectionId === 'entreguesVsNao') return lineChartJs?.data
    return null
  }
  const raw = getSectionData()
  if (!raw?.labels && !raw?.datasets?.length) return raw

  const labels = raw.labels || []
  const datasets = raw.datasets || []

  if (type === 'line') {
    return {
      labels,
      datasets: datasets.map((ds, i) => {
        const color = Array.isArray(ds.backgroundColor) ? ds.backgroundColor[0] : ds.backgroundColor || ds.borderColor || MODAL_PALETTE[i % MODAL_PALETTE.length]
        return {
          label: ds.label ?? 'Série',
          data: ds.data ?? [],
          borderColor: color,
          backgroundColor: hexToRgba(typeof color === 'string' && color.startsWith('#') ? color : MODAL_PALETTE[0], 0.1),
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        }
      }),
    }
  }

  if (type === 'bar') {
    const barColors = [CHART_COLORS.entregues, CHART_COLORS.naoEntregues, CHART_COLORS.outros]
    return {
      labels,
      datasets: datasets.map((ds) => ({
        label: ds.label,
        data: ds.data ?? [],
        backgroundColor: Array.isArray(ds.backgroundColor) ? ds.backgroundColor : (ds.backgroundColor ? [ds.backgroundColor] : barColors),
        borderRadius: 4,
        borderSkipped: false,
      })),
    }
  }

  if (type === 'radar') {
    const color = MODAL_PALETTE[0]
    return {
      labels,
      datasets: datasets.map((ds, i) => {
        const c = Array.isArray(ds.backgroundColor) ? ds.backgroundColor[0] : ds.backgroundColor || MODAL_PALETTE[i % MODAL_PALETTE.length]
        return {
          label: ds.label ?? 'Métrica',
          data: ds.data ?? [],
          backgroundColor: hexToRgba(typeof c === 'string' && c.startsWith('#') ? c : MODAL_PALETTE[0], 0.2),
          borderColor: typeof c === 'string' && c.startsWith('#') ? c : MODAL_PALETTE[0],
          pointBackgroundColor: typeof c === 'string' && c.startsWith('#') ? c : MODAL_PALETTE[0],
        }
      }),
    }
  }

  if (type === 'doughnut' || type === 'pie') {
    if (datasets.length > 1) {
      const aggLabels = datasets.map((ds) => ds.label ?? 'Série')
      const aggData = datasets.map((ds) => (ds.data ?? []).reduce((a, b) => a + b, 0))
      const aggColors = datasets.map((ds) =>
        Array.isArray(ds.backgroundColor) ? ds.backgroundColor[0] : ds.backgroundColor || MODAL_PALETTE[0]
      )
      return {
        labels: aggLabels,
        datasets: [{ data: aggData, backgroundColor: aggColors, borderWidth: 0 }],
      }
    }
    const firstDs = datasets[0]
    const colors = firstDs?.backgroundColor && Array.isArray(firstDs.backgroundColor)
      ? firstDs.backgroundColor
      : (firstDs?.backgroundColor ? [firstDs.backgroundColor] : MODAL_PALETTE)
    return {
      labels,
      datasets: [{ data: firstDs?.data ?? [], backgroundColor: colors, borderWidth: 0 }],
    }
  }

  if (type === 'polarArea') {
    if (datasets.length > 1) {
      const aggLabels = datasets.map((ds) => ds.label ?? 'Série')
      const aggData = datasets.map((ds) => (ds.data ?? []).reduce((a, b) => a + b, 0))
      const aggColors = datasets.map((ds) =>
        Array.isArray(ds.backgroundColor) ? ds.backgroundColor[0] : ds.backgroundColor || MODAL_PALETTE[0]
      )
      return {
        labels: aggLabels,
        datasets: [{
          data: aggData,
          backgroundColor: aggColors.map((c) => (typeof c === 'string' && c.startsWith('#') ? c + '99' : c)),
          borderWidth: 1,
          borderColor: aggColors,
        }],
      }
    }
    const firstDs = datasets[0]
    const colors = firstDs?.backgroundColor && Array.isArray(firstDs.backgroundColor)
      ? firstDs.backgroundColor
      : MODAL_PALETTE
    return {
      labels,
      datasets: [{
        data: firstDs?.data ?? [],
        backgroundColor: colors.map((c) => (typeof c === 'string' && c.startsWith('#') ? c + '99' : c)),
        borderWidth: 1,
        borderColor: colors,
      }],
    }
  }

  if (type === 'bubble') {
    const bubbleDatasets = datasets.map((ds, i) => {
      const values = ds.data ?? []
      const color = Array.isArray(ds.backgroundColor) ? ds.backgroundColor[0] : ds.backgroundColor || MODAL_PALETTE[i % MODAL_PALETTE.length]
      return {
        label: ds.label ?? 'Dados',
        data: values.map((val, j) => ({ x: j, y: val, r: Math.min(20, Math.max(5, val / 2)) })),
        backgroundColor: hexToRgba(typeof color === 'string' && color.startsWith('#') ? color : MODAL_PALETTE[0], 0.5),
        borderColor: typeof color === 'string' && color.startsWith('#') ? color : MODAL_PALETTE[0],
      }
    })
    return { labels, datasets: bubbleDatasets }
  }

  if (type === 'scatter') {
    const scatterDatasets = datasets.map((ds, i) => {
      const values = ds.data ?? []
      const color = Array.isArray(ds.backgroundColor) ? ds.backgroundColor[0] : ds.backgroundColor || MODAL_PALETTE[i % MODAL_PALETTE.length]
      return {
        label: ds.label ?? 'Dados',
        data: values.map((val, j) => ({ x: j, y: val })),
        backgroundColor: typeof color === 'string' && color.startsWith('#') ? color : MODAL_PALETTE[0],
        borderColor: typeof color === 'string' && color.startsWith('#') ? color : MODAL_PALETTE[0],
      }
    })
    return { labels, datasets: scatterDatasets }
  }

  return raw
}

/**
 * Devolve as opções do modal para um tipo – para a página ficar igual ao modal.
 */
function getModalOptionsForType(type) {
  const samples = getModalChartSamples()
  const sample = samples[type]
  return sample ? sample.options : getDefaultChartOptions(type)
}

/**
 * Opções do Chart.js por secção e tipo (idênticas ao modal de gráficos).
 * Só se adicionam tooltips específicos (percentagem, título motorista) sem mudar o aspeto.
 */
export function getOptionsForSectionType(sectionId, type, barChartJs, pieChartJs, motoristaBarChartJs, lineChartJs) {
  const base = getModalOptionsForType(type)

  if (sectionId === 'comparativo') {
    if (type === 'doughnut') {
      const labelFn = (ctx) => {
        const total = ctx.dataset?.data?.length ? ctx.dataset.data.reduce((a, b) => a + b, 0) : 0
        const pct = total ? ((ctx.raw / total) * 100).toFixed(0) : 0
        return `${ctx.label}: ${ctx.raw} (${pct}%)`
      }
      return { ...base, plugins: { ...base.plugins, tooltip: { callbacks: { label: labelFn } } } }
    }
    return base
  }

  if (sectionId === 'distribuicao') {
    if (type === 'doughnut' || type === 'pie') {
      const labelFn = (ctx) => {
        const total = ctx.dataset?.data?.length ? ctx.dataset.data.reduce((a, b) => a + b, 0) : 0
        const pct = total ? ((ctx.raw / total) * 100).toFixed(0) : 0
        return `${ctx.label}: ${ctx.raw} (${pct}%)`
      }
      return { ...base, plugins: { ...base.plugins, tooltip: { callbacks: { label: labelFn } } } }
    }
    return base
  }

  if (sectionId === 'performanceMotorista' || sectionId === 'entreguesVsNao') {
    const tooltipTitle = (items) => {
      const ctx = items[0]
      if (!ctx) return ''
      const label = ctx.chart?.data?.labels?.[ctx.dataIndex]
      return label != null && label !== '' ? `Motorista: ${label}` : (ctx.dataset?.label ?? '')
    }
    const opts = {
      ...base,
      interaction: base.interaction ?? { intersect: false, mode: 'index' },
      plugins: {
        ...base.plugins,
        legend: base.plugins?.legend ?? { position: 'bottom' },
        tooltip: {
          ...base.plugins?.tooltip,
          callbacks: { ...base.plugins?.tooltip?.callbacks, title: tooltipTitle },
        },
      },
    }
    if (sectionId === 'performanceMotorista' && type === 'bar') {
      opts.indexAxis = 'y'
    }
    return opts
  }

  return base
}
