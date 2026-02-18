import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../../context'
import { useEvolucao } from './hooks/useEvolucao.js'
import {
  STORAGE_KEY_CHART_CONFIG,
  loadChartConfig,
  DEFAULT_CHART_CONFIG,
} from './evolucaoChartTheme.js'
import { getOptionsForSectionType, getChartDataForSectionType } from './evolucaoChartOptions.js'
import { MARCA_KEY, EVOLUCAO_DATAS_STORAGE_KEY, getTodayLocal } from '../ResultadosConsulta/ResultadosConsulta.js'
import {
  EvolucaoHeader,
  EvolucaoCards,
  EvolucaoConfigModal,
  EvolucaoChartStylesModal,
  EvolucaoChartSection,
  EvolucaoTable,
} from './components'
import './Evolucao.css'

export default function Evolucao() {
  const navigate = useNavigate()
  const { user } = useAppContext()
  const token = user?.token

  const [selectedDatas, setSelectedDatasState] = useState(() => {
    try {
      const raw = localStorage.getItem(EVOLUCAO_DATAS_STORAGE_KEY)
      if (!raw) return [getTodayLocal()]
      const arr = JSON.parse(raw)
      if (!Array.isArray(arr)) return [getTodayLocal()]
      const valid = arr.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
      return valid.length > 0 ? valid : [getTodayLocal()]
    } catch {
      return [getTodayLocal()]
    }
  })

  const handleDatasChange = useCallback((newDatas) => {
    setSelectedDatasState(newDatas)
    try {
      localStorage.setItem(EVOLUCAO_DATAS_STORAGE_KEY, JSON.stringify(newDatas))
    } catch {}
  }, [])

  const {
    base,
    pedidos,
    loading,
    error,
    stats,
    performancePorMotorista,
    pieData,
    barData,
    barChartJs,
    pieChartJs,
    lineChartJs,
    motoristaBarChartJs,
    pageTitle,
    pageSubtitle,
    tableTitle,
    getStatusPillClass,
    MOTORISTA_COLUMNS,
  } = useEvolucao(selectedDatas)

  const [modalEstilosAberto, setModalEstilosAberto] = useState(false)
  const [modalConfigAberto, setModalConfigAberto] = useState(false)
  const [chartConfig, setChartConfigState] = useState(loadChartConfig)

  const setChartConfig = useCallback((next) => {
    setChartConfigState((prev) => {
      const nextConfig = typeof next === 'function' ? next(prev) : next
      try {
        localStorage.setItem(STORAGE_KEY_CHART_CONFIG, JSON.stringify(nextConfig))
      } catch {}
      return nextConfig
    })
  }, [])

  useEffect(() => {
    if (!modalEstilosAberto && !modalConfigAberto) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (modalConfigAberto) setModalConfigAberto(false)
        else setModalEstilosAberto(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalEstilosAberto, modalConfigAberto])

  if (!base) return null

  const { total, entregues, naoEntregues, outros, pctEntregues, pctNaoEntregues } = stats

  return (
    <div className="evolucao">
      <EvolucaoHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        onConfig={() => setModalConfigAberto(true)}
        onGraficos={() => setModalEstilosAberto(true)}
        onVoltar={() => navigate(-1)}
      />

      <EvolucaoConfigModal
        open={modalConfigAberto}
        onClose={() => setModalConfigAberto(false)}
        token={token}
        selectedDatas={selectedDatas}
        onDatasChange={handleDatasChange}
        chartConfig={chartConfig}
        onChartConfigChange={setChartConfig}
        onRestoreDefault={() => setChartConfig(DEFAULT_CHART_CONFIG)}
      />

      <EvolucaoChartStylesModal open={modalEstilosAberto} onClose={() => setModalEstilosAberto(false)} />

      {loading && (
        <div className="evolucao__loading" aria-busy="true">
          <span className="evolucao__spinner" aria-hidden />
          <span>A carregar…</span>
        </div>
      )}

      {error && (
        <div className="evolucao__error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && (
        <section className="evolucao__content">
          <EvolucaoCards
            total={total}
            entregues={entregues}
            naoEntregues={naoEntregues}
            outros={outros}
            pctEntregues={pctEntregues}
            pctNaoEntregues={pctNaoEntregues}
          />

          <div className="evolucao__charts">
            <EvolucaoChartSection
              title="Comparativo (quantidade)"
              type={chartConfig.comparativo}
              data={getChartDataForSectionType(
                'comparativo',
                chartConfig.comparativo,
                barChartJs,
                pieChartJs,
                motoristaBarChartJs,
                lineChartJs
              )}
              options={getOptionsForSectionType(
                'comparativo',
                chartConfig.comparativo,
                barChartJs,
                pieChartJs,
                motoristaBarChartJs,
                lineChartJs
              )}
              height={280}
              hasData={total > 0 && barData.length > 0}
              wrapClassName="evolucao__chart-wrap--bar"
            />
            <EvolucaoChartSection
              title="Distribuição por status"
              type={chartConfig.distribuicao}
              data={getChartDataForSectionType(
                'distribuicao',
                chartConfig.distribuicao,
                barChartJs,
                pieChartJs,
                motoristaBarChartJs,
                lineChartJs
              )}
              options={getOptionsForSectionType(
                'distribuicao',
                chartConfig.distribuicao,
                barChartJs,
                pieChartJs,
                motoristaBarChartJs,
                lineChartJs
              )}
              height={280}
              hasData={total > 0 && pieData.length > 0}
              wrapClassName="evolucao__chart-wrap--pie"
            />
            {total > 0 && performancePorMotorista.length > 0 && (
              <>
                <EvolucaoChartSection
                  title="Performance por motorista"
                  type={chartConfig.performanceMotorista}
                  data={getChartDataForSectionType(
                    'performanceMotorista',
                    chartConfig.performanceMotorista,
                    barChartJs,
                    pieChartJs,
                    motoristaBarChartJs,
                    lineChartJs
                  )}
                  options={getOptionsForSectionType(
                    'performanceMotorista',
                    chartConfig.performanceMotorista,
                    barChartJs,
                    pieChartJs,
                    motoristaBarChartJs,
                    lineChartJs
                  )}
                  height={320}
                  hasData
                  wrapClassName="evolucao__chart-wrap--motoristas"
                />
                <EvolucaoChartSection
                  title="Entregues vs Não entregues"
                  type={chartConfig.entreguesVsNao}
                  data={getChartDataForSectionType(
                    'entreguesVsNao',
                    chartConfig.entreguesVsNao,
                    barChartJs,
                    pieChartJs,
                    motoristaBarChartJs,
                    lineChartJs
                  )}
                  options={getOptionsForSectionType(
                    'entreguesVsNao',
                    chartConfig.entreguesVsNao,
                    barChartJs,
                    pieChartJs,
                    motoristaBarChartJs,
                    lineChartJs
                  )}
                  height={320}
                  hasData
                  wrapClassName="evolucao__chart-wrap--lines"
                />
              </>
            )}
          </div>

          {total > 0 && (
            <EvolucaoTable
              data={pedidos.slice(0, 50)}
              columns={MOTORISTA_COLUMNS.slice(0, 7)}
              marcaKey={MARCA_KEY}
              getStatusPillClass={getStatusPillClass}
              title={tableTitle}
              showMoreText={pedidos.length > 50 ? `A mostrar 50 de ${pedidos.length} pedidos.` : ''}
            />
          )}
        </section>
      )}
    </div>
  )
}
