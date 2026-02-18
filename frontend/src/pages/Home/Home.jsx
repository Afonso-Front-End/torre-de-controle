import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MdLogout } from 'react-icons/md'
import { useAppContext } from '../../context'
import { transition, overlayVariants, modalContentVariants } from '../../utils/animations'
import { ACESSO_RAPIDO } from './Home.js'
import './Home.css'

function Home() {
  const navigate = useNavigate()
  const { user, logout } = useAppContext()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <section className="home-page">
      <div className="home-quick-grid">
        {ACESSO_RAPIDO.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className="home-quick-card"
            >
              <span className="home-quick-card__icon" aria-hidden>
                <Icon />
              </span>
              <h2 className="home-quick-card__title">{item.title}</h2>
              <p className="home-quick-card__desc">{item.desc}</p>
            </Link>
          )
        })}
      </div>

      <footer className="home-footer">
        <button
          type="button"
          className="home-logout-btn"
          onClick={() => setShowLogoutConfirm(true)}
          aria-label="Sair da conta"
        >
          <MdLogout className="home-logout-btn__icon" aria-hidden />
          Sair da conta
        </button>
      </footer>

      <AnimatePresence>
          {showLogoutConfirm && (
            <motion.div
              className="home-confirm-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition}
              onClick={() => setShowLogoutConfirm(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="home-logout-confirm-title"
            >
              <motion.div
                className="home-confirm-modal"
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={transition}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="home-logout-confirm-title" className="home-confirm-title">Sair da conta?</h2>
                <p className="home-confirm-message">Tem certeza que deseja sair?</p>
                <div className="home-confirm-actions">
                  <button type="button" className="home-button home-button--secondary" onClick={() => setShowLogoutConfirm(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="home-button" onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}>
                    Sair
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </section>
  )
}

export default Home
