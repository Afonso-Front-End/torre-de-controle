import { MdInventory2, MdTaskAlt, MdPendingActions, MdCategory } from 'react-icons/md'
import './EvolucaoCards.css'

export default function EvolucaoCards({
  total = 0,
  entregues = 0,
  naoEntregues = 0,
  outros = 0,
  pctEntregues = 0,
  pctNaoEntregues = 0,
}) {
  return (
    <div className={`evolucao__cards evolucao__cards--${outros > 0 ? 4 : 3}`}>
      <div className="evolucao__card evolucao__card--total">
        <div className="evolucao__card-icon" aria-hidden>
          <MdInventory2 />
        </div>
        <span className="evolucao__card-label">Total de pedidos</span>
        <span className="evolucao__card-value">{total}</span>
      </div>
      <div className="evolucao__card evolucao__card--entregues">
        <div className="evolucao__card-icon" aria-hidden>
          <MdTaskAlt />
        </div>
        <span className="evolucao__card-label">Entregues</span>
        <span className="evolucao__card-value">{entregues}</span>
        <span className="evolucao__card-pct evolucao__card-pct--positive">{pctEntregues}% do total</span>
      </div>
      <div className="evolucao__card evolucao__card--nao-entregues">
        <div className="evolucao__card-icon" aria-hidden>
          <MdPendingActions />
        </div>
        <span className="evolucao__card-label">Não entregues</span>
        <span className="evolucao__card-value">{naoEntregues}</span>
        <span className="evolucao__card-pct evolucao__card-pct--negative">{pctNaoEntregues}% do total</span>
      </div>
      {outros > 0 && (
        <div className="evolucao__card evolucao__card--outros">
          <div className="evolucao__card-icon" aria-hidden>
            <MdCategory />
          </div>
          <span className="evolucao__card-label">Outros</span>
          <span className="evolucao__card-value">{outros}</span>
        </div>
      )}
    </div>
  )
}
