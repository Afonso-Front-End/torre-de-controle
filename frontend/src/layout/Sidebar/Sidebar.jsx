import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  TbHome,
  TbPhone,
  TbCalendar,
  TbChartBar,
  TbUser,
  TbChevronDown,
  TbChevronUp,
  TbBook,
} from 'react-icons/tb'
import './Sidebar.css'

const iconSize = 22
const chevronSize = 18

export function Sidebar() {
  const location = useLocation()
  const isVerificarSection = location.pathname === '/verificar-pedidos-parados' || location.pathname === '/consultar-pedidos' || location.pathname === '/resultados-consulta'
  const isSLASection = location.pathname === '/sla' || location.pathname.startsWith('/sla/')
  const [verificarOpen, setVerificarOpen] = useState(isVerificarSection)
  const [slaOpen, setSlaOpen] = useState(isSLASection)

  useEffect(() => {
    if (isVerificarSection) setVerificarOpen(true)
  }, [isVerificarSection])

  useEffect(() => {
    if (isSLASection) setSlaOpen(true)
  }, [isSLASection])

  return (
    <aside className="layout-sidebar">
      <div className="layout-sidebar__header">
        <span className="layout-sidebar__title">Menu</span>
      </div>
      <nav className="layout-sidebar__nav">
        <Link
          to="/"
          className={`layout-sidebar__link ${location.pathname === '/' ? 'layout-sidebar__link--active' : ''}`}
        >
          <TbHome className="layout-sidebar__icon" size={iconSize} aria-hidden />
          <span>Início</span>
        </Link>
        <Link
          to="/lista-telefones"
          className={`layout-sidebar__link ${location.pathname === '/lista-telefones' ? 'layout-sidebar__link--active' : ''}`}
        >
          <TbPhone className="layout-sidebar__icon" size={iconSize} aria-hidden />
          <span>Lista de telefones</span>
        </Link>
        <div className="layout-sidebar__accordion">
          <button
            type="button"
            className={`layout-sidebar__accordion-trigger ${verificarOpen ? 'layout-sidebar__accordion-trigger--open' : ''} ${isVerificarSection ? 'layout-sidebar__accordion-trigger--active' : ''}`}
            onClick={() => setVerificarOpen((v) => !v)}
            aria-expanded={verificarOpen}
            aria-controls="sidebar-verificar-pedidos"
            id="sidebar-verificar-trigger"
          >
            <TbCalendar className="layout-sidebar__icon" size={iconSize} aria-hidden />
            <span>Verificar pedidos</span>
            {verificarOpen ? (
              <TbChevronUp className="layout-sidebar__accordion-chevron" size={chevronSize} aria-hidden />
            ) : (
              <TbChevronDown className="layout-sidebar__accordion-chevron" size={chevronSize} aria-hidden />
            )}
          </button>
          <div
            id="sidebar-verificar-pedidos"
            className="layout-sidebar__accordion-panel"
            role="region"
            aria-labelledby="sidebar-verificar-trigger"
            hidden={!verificarOpen}
          >
            <Link
              to="/verificar-pedidos-parados"
              className={`layout-sidebar__sublink ${location.pathname === '/verificar-pedidos-parados' ? 'layout-sidebar__sublink--active' : ''}`}
            >
              Importe tabela de pedidos
            </Link>
            <Link
              to="/consultar-pedidos"
              className={`layout-sidebar__sublink ${location.pathname === '/consultar-pedidos' ? 'layout-sidebar__sublink--active' : ''}`}
            >
              Importe tabela Consulta das bipagems em tempo real
            </Link>
            <Link
              to="/resultados-consulta"
              className={`layout-sidebar__sublink ${location.pathname === '/resultados-consulta' ? 'layout-sidebar__sublink--active' : ''}`}
            >
              Área de trabalho
            </Link>
          </div>
        </div>
        <div className="layout-sidebar__accordion">
          <button
            type="button"
            className={`layout-sidebar__accordion-trigger ${slaOpen ? 'layout-sidebar__accordion-trigger--open' : ''} ${isSLASection ? 'layout-sidebar__accordion-trigger--active' : ''}`}
            onClick={() => setSlaOpen((v) => !v)}
            aria-expanded={slaOpen}
            aria-controls="sidebar-sla-analise"
            id="sidebar-sla-analise-trigger"
          >
            <TbChartBar className="layout-sidebar__icon" size={iconSize} aria-hidden />
            <span>SLA + Análise</span>
            {slaOpen ? (
              <TbChevronUp className="layout-sidebar__accordion-chevron" size={chevronSize} aria-hidden />
            ) : (
              <TbChevronDown className="layout-sidebar__accordion-chevron" size={chevronSize} aria-hidden />
            )}
          </button>
          <div
            id="sidebar-sla-analise"
            className="layout-sidebar__accordion-panel"
            role="region"
            aria-labelledby="sidebar-sla-analise-trigger"
            hidden={!slaOpen}
          >
            <Link
              to="/sla"
              className={`layout-sidebar__sublink ${location.pathname === '/sla' || location.pathname === '/sla/performance' ? 'layout-sidebar__sublink--active' : ''}`}
            >
              SLA
            </Link>
            <Link
              to="/sla/analise"
              className={`layout-sidebar__sublink ${location.pathname === '/sla/analise' ? 'layout-sidebar__sublink--active' : ''}`}
            >
              Análise
            </Link>
          </div>
        </div>
        <Link
          to="/documentacao"
          className={`layout-sidebar__link ${location.pathname === '/documentacao' ? 'layout-sidebar__link--active' : ''}`}
        >
          <TbBook className="layout-sidebar__icon" size={iconSize} aria-hidden />
          <span>Documentação</span>
        </Link>
        <Link
          to="/perfil"
          className={`layout-sidebar__link ${location.pathname === '/perfil' ? 'layout-sidebar__link--active' : ''}`}
        >
          <TbUser className="layout-sidebar__icon" size={iconSize} aria-hidden />
          <span>Perfil</span>
        </Link>
      </nav>
    </aside>
  )
}
