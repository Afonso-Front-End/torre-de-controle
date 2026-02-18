import { MdArrowBack, MdBarChart, MdSettings } from 'react-icons/md'
import './EvolucaoHeader.css'

export default function EvolucaoHeader({ title, subtitle, onConfig, onGraficos, onVoltar }) {
  return (
    <header className="evolucao__header">
      <div className="evolucao__header-text">
        <h1 className="evolucao__title">{title}</h1>
        <p className="evolucao__subtitle">{subtitle}</p>
      </div>
      <div className="evolucao__header-actions">
        <button
          type="button"
          className="evolucao__btn-graficos"
          onClick={onConfig}
          aria-label="Configuração (data e gráficos)"
        >
          <MdSettings className="evolucao__btn-graficos-icon" aria-hidden />
        </button>
        <button
          type="button"
          className="evolucao__btn-graficos"
          onClick={onGraficos}
          aria-label="Ver estilos de gráficos"
        >
          <MdBarChart className="evolucao__btn-graficos-icon" aria-hidden />
        </button>
        <button
          type="button"
          className="evolucao__btn-voltar"
          onClick={onVoltar}
          aria-label="Voltar à página anterior"
        >
          <MdArrowBack className="evolucao__btn-voltar-icon" aria-hidden />
        </button>
      </div>
    </header>
  )
}
