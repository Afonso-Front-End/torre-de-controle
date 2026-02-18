import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppContext } from '../../../../context'
import { getResultadosConsultaMotorista } from '../../../../services'
import {
  CORREIO_KEY,
  BASE_KEY,
  MARCA_KEY,
  PER_PAGE_FETCH,
  getTodayLocal,
  isEntregue,
  isNaoEntregue,
  MOTORISTA_COLUMNS,
} from '../../ResultadosConsulta/ResultadosConsulta.js'
import { CHART_COLORS } from '../evolucaoChartTheme.js'

function getStatusPillClass(marca) {
  if (isEntregue(marca)) return 'evolucao__table-pill--completed'
  if (isNaoEntregue(marca)) return 'evolucao__table-pill--cancelled'
  return 'evolucao__table-pill--pending'
}

/**
 * Hook com dados e lógica da página Evolução (performance da base ou do motorista).
 * @param {string[]} [selectedDatas] - Datas para filtrar (YYYY-MM-DD). Se vazio/null, usa data atual.
 * Retorna: pedidos, loading, error, stats, chart data, títulos e getStatusPillClass.
 */
export function useEvolucao(selectedDatas = null) {
  const { user, setGlobalLoading } = useAppContext()
  const navigate = useNavigate()
  const location = useLocation()
  const token = user?.token
  const state = location.state || {}
  const correio = state.correio ?? ''
  const base = state.base ?? ''
  const viewBase = state.view === 'base'
  const isBase = viewBase && base

  const [loading, setLoading] = useState(true)
  const [pedidos, setPedidos] = useState([])
  const [error, setError] = useState(null)

  const datasParam = useMemo(() => {
    if (Array.isArray(selectedDatas) && selectedDatas.length > 0) return selectedDatas
    return [getTodayLocal()]
  }, [selectedDatas])

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    setGlobalLoading(true, 'A carregar evolução…')
    try {
      const all = []
      let pageNum = 1
      let totalCount = 0
      do {
        const res = await getResultadosConsultaMotorista(
          token,
          pageNum,
          PER_PAGE_FETCH,
          datasParam,
          true
        )
        const chunk = res.data || []
        totalCount = res.total ?? 0
        all.push(...chunk)
        if (all.length >= totalCount || chunk.length < PER_PAGE_FETCH) break
        pageNum += 1
      } while (true)
      const filtered = isBase
        ? all.filter((doc) => String(doc[BASE_KEY] ?? '').trim() === base)
        : all.filter(
            (doc) =>
              String(doc[CORREIO_KEY] ?? '').trim() === correio &&
              String(doc[BASE_KEY] ?? '').trim() === base
          )
      setPedidos(filtered)
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados.')
      setPedidos([])
    } finally {
      setLoading(false)
      setGlobalLoading(false)
    }
  }, [token, correio, base, isBase, datasParam, setGlobalLoading])

  useEffect(() => {
    if (!base) {
      navigate('/resultados-consulta', { replace: true })
      return
    }
    fetchData()
  }, [base, navigate, fetchData])

  const total = pedidos.length
  const entregues = pedidos.filter((doc) => isEntregue(doc[MARCA_KEY])).length
  const naoEntregues = pedidos.filter((doc) => isNaoEntregue(doc[MARCA_KEY])).length
  const outros = total - entregues - naoEntregues
  const pctEntregues = total > 0 ? Math.round((entregues / total) * 100) : 0
  const pctNaoEntregues = total > 0 ? Math.round((naoEntregues / total) * 100) : 0

  const stats = useMemo(
    () => ({ total, entregues, naoEntregues, outros, pctEntregues, pctNaoEntregues }),
    [total, entregues, naoEntregues, outros, pctEntregues, pctNaoEntregues]
  )

  const performancePorMotorista = useMemo(() => {
    const byCorreio = new Map()
    pedidos.forEach((doc) => {
      const m = String(doc[CORREIO_KEY] ?? '').trim() || '—'
      if (!byCorreio.has(m)) {
        byCorreio.set(m, { motorista: m, entregues: 0, naoEntregues: 0, outros: 0 })
      }
      const row = byCorreio.get(m)
      if (isEntregue(doc[MARCA_KEY])) row.entregues += 1
      else if (isNaoEntregue(doc[MARCA_KEY])) row.naoEntregues += 1
      else row.outros += 1
    })
    return Array.from(byCorreio.values())
      .map((r) => ({ ...r, total: r.entregues + r.naoEntregues + r.outros }))
      .sort((a, b) => b.total - a.total)
  }, [pedidos])

  const pieData = useMemo(() => {
    const items = [
      { name: 'Entregues', value: entregues, color: CHART_COLORS.entregues },
      { name: 'Não entregues', value: naoEntregues, color: CHART_COLORS.naoEntregues },
    ]
    if (outros > 0) items.push({ name: 'Outros', value: outros, color: CHART_COLORS.outros })
    return items.filter((d) => d.value > 0)
  }, [entregues, naoEntregues, outros])

  const barData = useMemo(
    () => [
      { categoria: 'Entregues', quantidade: entregues, fill: CHART_COLORS.entregues },
      { categoria: 'Não entregues', quantidade: naoEntregues, fill: CHART_COLORS.naoEntregues },
      ...(outros > 0 ? [{ categoria: 'Outros', quantidade: outros, fill: CHART_COLORS.outros }] : []),
    ],
    [entregues, naoEntregues, outros]
  )

  const lineChartData = useMemo(() => {
    if (performancePorMotorista.length >= 2) return performancePorMotorista
    if (performancePorMotorista.length === 1) {
      return [performancePorMotorista[0], { ...performancePorMotorista[0], motorista: '' }]
    }
    return []
  }, [performancePorMotorista])

  const barChartJs = useMemo(
    () => ({
      data: {
        labels: barData.map((d) => d.categoria),
        datasets: [
          {
            label: 'Pedidos',
            data: barData.map((d) => d.quantidade),
            backgroundColor: barData.map((d) => d.fill),
            borderSkipped: false,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { min: 0, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b', font: { size: 12 } } },
          y: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 12 } } },
        },
      },
    }),
    [barData]
  )

  const pieChartJs = useMemo(
    () => ({
      data: {
        labels: pieData.map((d) => d.name),
        datasets: [
          {
            data: pieData.map((d) => d.value),
            backgroundColor: pieData.map((d) => d.color),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#0f172a', font: { size: 12 }, padding: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.label}: ${ctx.raw} (${((ctx.raw / ctx.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(0)}%)`,
            },
          },
        },
      },
    }),
    [pieData]
  )

  const lineChartJs = useMemo(
    () => ({
      data: {
        labels: lineChartData.map((d) => d.motorista),
        datasets: [
          {
            label: 'Entregues',
            data: lineChartData.map((d) => d.entregues),
            borderColor: CHART_COLORS.entregues,
            backgroundColor: CHART_COLORS.entregues,
            tension: 0.2,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          {
            label: 'Não entregues',
            data: lineChartData.map((d) => d.naoEntregues),
            borderColor: CHART_COLORS.naoEntregues,
            backgroundColor: CHART_COLORS.naoEntregues,
            tension: 0.2,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { position: 'bottom', labels: { color: '#0f172a', font: { size: 13 }, padding: 10 } },
          tooltip: { callbacks: { title: (items) => `Motorista: ${items[0]?.label ?? ''}` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 35 } },
          y: { min: 0, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b', font: { size: 12 } } },
        },
      },
    }),
    [lineChartData]
  )

  const motoristaBarChartJs = useMemo(
    () => ({
      data: {
        labels: performancePorMotorista.map((d) => d.motorista),
        datasets: [
          {
            label: 'Entregues',
            data: performancePorMotorista.map((d) => d.entregues),
            backgroundColor: CHART_COLORS.entregues,
            stack: 'stack1',
            borderRadius: 4,
          },
          {
            label: 'Não entregues',
            data: performancePorMotorista.map((d) => d.naoEntregues),
            backgroundColor: CHART_COLORS.naoEntregues,
            stack: 'stack1',
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#0f172a', font: { size: 13 }, padding: 10 } },
          tooltip: { callbacks: { title: (items) => `Motorista: ${items[0]?.label ?? ''}` } },
        },
        scales: {
          x: {
            stacked: true,
            min: 0,
            grid: { color: '#e2e8f0' },
            ticks: { color: '#64748b', font: { size: 12 } },
          },
          y: {
            stacked: true,
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 11 } },
          },
        },
      },
    }),
    [performancePorMotorista]
  )

  const pageTitle = isBase ? 'Performance da base' : 'Evolução do motorista'
  const pageSubtitle = isBase ? base : (correio ? `${correio}${base ? ` — ${base}` : ''}` : base)
  const tableTitle = isBase ? 'Pedidos da base' : 'Pedidos do motorista'

  return {
    base,
    pedidos,
    loading,
    error,
    fetchData,
    stats,
    performancePorMotorista,
    pieData,
    barData,
    lineChartData,
    barChartJs,
    pieChartJs,
    lineChartJs,
    motoristaBarChartJs,
    pageTitle,
    pageSubtitle,
    tableTitle,
    getStatusPillClass,
    MOTORISTA_COLUMNS,
  }
}
