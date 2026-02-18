import { SLA_PAGE_TITLE } from './SLA.js'
import './SLA.css'

export default function SLA() {
  return (
    <div className="sla">
      <header className="sla__header">
        <h1 className="sla__title">{SLA_PAGE_TITLE}</h1>
        <p className="sla__desc">Página em estruturação.</p>
      </header>
      <section className="sla__content">
        <p className="sla__placeholder">Conteúdo a definir.</p>
      </section>
    </div>
  )
}
