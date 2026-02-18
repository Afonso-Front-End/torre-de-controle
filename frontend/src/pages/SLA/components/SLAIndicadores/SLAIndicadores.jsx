import { useState, useEffect, useCallback } from 'react'
import { getSLAIndicadores } from '../../../../services'
import './SLAIndicadores.css'

function TabelaIndicadores({ titulo, itens, loading }) {
  if (loading) {
    return (
      <div className="sla-indicadores__card">
        <h3 className="sla-indicadores__card-title">{titulo}</h3>
        <p className="sla-indicadores__loading">A carregar…</p>
      </div>
    )
  }
  if (!itens || itens.length === 0) {
    return (
      <div className="sla-indicadores__card">
        <h3 className="sla-indicadores__card-title">{titulo}</h3>
        <p className="sla-indicadores__empty">Nenhum dado para exibir.</p>
      </div>
    )
  }
  return (
    <div className="sla-indicadores__card">
      <h3 className="sla-indicadores__card-title">{titulo}</h3>
      <div className="sla-indicadores__table-wrap">
        <table className="sla-indicadores__table">
          <thead>
            <tr>
              <th className="sla-indicadores__th sla-indicadores__th--nome">Nome</th>
              <th className="sla-indicadores__th">Total entregues</th>
              <th className="sla-indicadores__th">No prazo</th>
              <th className="sla-indicadores__th">Em atraso</th>
              <th className="sla-indicadores__th sla-indicadores__th--pct">% SLA</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((row, i) => (
              <tr key={i}>
                <td className="sla-indicadores__td sla-indicadores__td--nome">{row.nome}</td>
                <td className="sla-indicadores__td">{row.totalEntregues}</td>
                <td className="sla-indicadores__td">{row.noPrazo}</td>
                <td className="sla-indicadores__td">{row.emAtraso}</td>
                <td className="sla-indicadores__td sla-indicadores__td--pct">
                  <span className={row.percentualSla >= 90 ? 'sla-indicadores__pct--ok' : row.percentualSla >= 70 ? 'sla-indicadores__pct--medio' : 'sla-indicadores__pct--baixo'}>
                    {row.percentualSla}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SLAIndicadores({ token, datas }) {
  const [loading, setLoading] = useState(true)
  const [porBase, setPorBase] = useState([])
  const [porMotorista, setPorMotorista] = useState([])

  const fetchIndicadores = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await getSLAIndicadores(token, datas)
      setPorBase(res.porBase || [])
      setPorMotorista(res.porMotorista || [])
    } catch {
      setPorBase([])
      setPorMotorista([])
    } finally {
      setLoading(false)
    }
  }, [token, datas])

  useEffect(() => {
    fetchIndicadores()
  }, [fetchIndicadores])

  return (
    <section className="sla-indicadores" aria-labelledby="sla-indicadores-title">
      <h2 id="sla-indicadores-title" className="sla-indicadores__title">
        Resumo agrupado (total por responsável)
      </h2>
      <div className="sla-indicadores__grid">
        <TabelaIndicadores titulo="Por motorista (Responsável pela entrega)" itens={porMotorista} loading={loading} />
        <TabelaIndicadores titulo="Por base" itens={porBase} loading={loading} />
      </div>
    </section>
  )
}
