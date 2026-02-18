import './SLAHeader.css'

export default function SLAHeader({ title, description }) {
  return (
    <header className="sla-header">
      <h1 className="sla-header__title">{title}</h1>
      {description && <p className="sla-header__desc">{description}</p>}
    </header>
  )
}
