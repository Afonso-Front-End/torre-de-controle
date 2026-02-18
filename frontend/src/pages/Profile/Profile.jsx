import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MdEdit } from 'react-icons/md'
import { SiInstagram, SiX, SiDribbble } from 'react-icons/si'
import { useAppContext } from '../../context'
import { updatePerfil, updateConfig } from '../../services'
import { transition, overlayVariants, modalContentVariants } from '../../utils/animations'
import {
  AVATAR_OPTIONS,
  TEMA_OPTIONS,
  LINHAS_OPTIONS,
  getAvatarUrl,
  getFullConfig,
} from './Profile.js'
import './Profile.css'

function Profile() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAppContext()
  const [avatarError, setAvatarError] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedFoto, setSelectedFoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [configError, setConfigError] = useState('')
  const [openConfigDropdown, setOpenConfigDropdown] = useState(null) // 'tema' | 'linhas' | null
  const configDropdownRef = useRef(null)

  /* Fechar dropdown de configuração ao clicar fora (trigger ou área do dropdown). */
  useEffect(() => {
    if (openConfigDropdown == null) return
    function handleClickOutside(e) {
      if (e.target.closest('.profile-config__trigger')) return
      if (configDropdownRef.current?.contains(e.target)) return
      setOpenConfigDropdown(null)
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [openConfigDropdown])

  const config = user?.config ?? {}
  const temaAtual = config.tema ?? 'sistema'
  const linhasAtual = config.linhas_por_pagina ?? 25
  const initial = user?.nome?.charAt(0)?.toUpperCase() || '?'
  const avatarUrl = getAvatarUrl(user)
  const showImg = avatarUrl && !avatarError

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function openEditModal() {
    setSelectedFoto(null)
    setEditError('')
    setShowEditModal(true)
  }

  function closeEditModal() {
    setShowEditModal(false)
    setSelectedFoto(null)
    setEditError('')
  }

  async function handleSaveFoto() {
    if (!selectedFoto || !user?.token) return
    setSaving(true)
    setEditError('')
    try {
      const data = await updatePerfil(user.token, selectedFoto)
      setUser({ ...user, foto: data.foto ?? selectedFoto })
      closeEditModal()
    } catch (err) {
      setEditError(err.message || 'Erro ao salvar foto.')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfigChange(key, value) {
    if (!user?.token) return
    setConfigError('')
    setSavingConfig(true)
    try {
      const fullConfig = getFullConfig(config, { [key]: value })
      const data = await updateConfig(user.token, fullConfig)
      setUser({ ...user, config: data.config ?? fullConfig })
    } catch (err) {
      setConfigError(err.message || 'Erro ao salvar configuração.')
    } finally {
      setSavingConfig(false)
    }
  }

  return (
    <section className="profile-page">
      <div className="profile-card">
        <div className="profile-card__inner">
          <div className="profile-card__main">
            <div className="profile-card__header">
              <div className="profile-card__sky" aria-hidden />
            </div>

            <div className="profile-card__avatar-wrap">
              <div className="profile-card__avatar-ring">
                {showImg ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="profile-card__avatar profile-card__avatar--img"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="profile-card__avatar profile-card__avatar--fallback" aria-hidden>
                    {initial}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="profile-card__edit-avatar-btn"
                onClick={openEditModal}
                aria-label="Editar foto do perfil"
                title="Editar foto"
              >
                <MdEdit className="profile-card__edit-avatar-icon" aria-hidden />
              </button>
            </div>

            <h1 className="profile-card__name">{user?.nome ?? 'Usuário'}</h1>
            <p className="profile-card__bio">
              Torre de Controle
            </p>

            <div className="profile-card__stats">
              <div className="profile-card__stat">
                <span className="profile-card__stat-value">—</span>
                <span className="profile-card__stat-label">Em breve</span>
              </div>
              <div className="profile-card__stat">
                <span className="profile-card__stat-value">—</span>
                <span className="profile-card__stat-label">Em breve</span>
              </div>
              <div className="profile-card__stat">
                <span className="profile-card__stat-value">—</span>
                <span className="profile-card__stat-label">Em breve</span>
              </div>
            </div>

            <div className="profile-card__social">
              <a href="#instagram" className="profile-card__social-link" aria-label="Instagram">
                <SiInstagram aria-hidden />
              </a>
              <a href="#x" className="profile-card__social-link" aria-label="X (Twitter)">
                <SiX aria-hidden />
              </a>
              <a href="#dribbble" className="profile-card__social-link" aria-label="Dribbble">
                <SiDribbble aria-hidden />
              </a>
            </div>

            <div className="profile-card__actions">
              <button type="button" className="profile-button profile-button--primary" onClick={() => setShowLogoutConfirm(true)}>
                Sair da conta
              </button>
            </div>
          </div>

          <div className="profile-card__config">
            <h2 className="profile-card__config-title">Configurações</h2>
            <p className="profile-card__config-desc">
              {Object.keys(config).length === 0
                ? 'Valores padrão abaixo. Altere qualquer opção e salve para guardar na sua conta (perfil no banco).'
                : 'As opções abaixo ficam salvas na sua conta.'}
            </p>
            {configError && <p className="profile-card__config-error">{configError}</p>}
            <div className="profile-card__config-dropdowns" ref={configDropdownRef}>
            <div className="profile-card__config-row">
              <label className="profile-card__config-label" id="config-tema-label">Tema</label>
              <div className="profile-config__dropdown-wrap">
                <button
                  type="button"
                  className="profile-config__trigger"
                  onClick={() => setOpenConfigDropdown((v) => (v === 'tema' ? null : 'tema'))}
                  disabled={savingConfig}
                  title="Aparência do sistema"
                  aria-expanded={openConfigDropdown === 'tema'}
                  aria-haspopup="listbox"
                  aria-labelledby="config-tema-label"
                >
                  <span className="profile-config__trigger-label">
                    {TEMA_OPTIONS.find((o) => o.value === temaAtual)?.label ?? 'Sistema'}
                  </span>
                  <svg className="profile-config__trigger-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openConfigDropdown === 'tema' && (
                  <div className="profile-config__panel" role="listbox" aria-labelledby="config-tema-label">
                    <div className="profile-config__panel-inner">
                      <div className="profile-config__option-list">
                        {TEMA_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={temaAtual === opt.value}
                            className={`profile-config__option ${temaAtual === opt.value ? 'profile-config__option--selected' : ''}`}
                            onClick={() => {
                              handleConfigChange('tema', opt.value)
                              setOpenConfigDropdown(null)
                            }}
                          >
                            <span className="profile-config__option-icon" aria-hidden>
                              {temaAtual === opt.value ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                              ) : null}
                            </span>
                            <span className="profile-config__option-text">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="profile-card__config-row">
              <label className="profile-card__config-label" id="config-linhas-label">Linhas por página (tabelas)</label>
              <div className="profile-config__dropdown-wrap">
                <button
                  type="button"
                  className="profile-config__trigger"
                  onClick={() => setOpenConfigDropdown((v) => (v === 'linhas' ? null : 'linhas'))}
                  disabled={savingConfig}
                  title="Valor padrão nas tabelas de lista e pedidos"
                  aria-expanded={openConfigDropdown === 'linhas'}
                  aria-haspopup="listbox"
                  aria-labelledby="config-linhas-label"
                >
                  <span className="profile-config__trigger-label">{linhasAtual}</span>
                  <svg className="profile-config__trigger-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openConfigDropdown === 'linhas' && (
                  <div className="profile-config__panel" role="listbox" aria-labelledby="config-linhas-label">
                    <div className="profile-config__panel-inner">
                      <div className="profile-config__option-list">
                        {LINHAS_OPTIONS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            role="option"
                            aria-selected={linhasAtual === n}
                            className={`profile-config__option ${linhasAtual === n ? 'profile-config__option--selected' : ''}`}
                            onClick={() => {
                              handleConfigChange('linhas_por_pagina', n)
                              setOpenConfigDropdown(null)
                            }}
                          >
                            <span className="profile-config__option-icon" aria-hidden>
                              {linhasAtual === n ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                              ) : null}
                            </span>
                            <span className="profile-config__option-text">{n}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
            {savingConfig && <p className="profile-card__config-saving">Salvando…</p>}
          </div>
        </div>
      </div>

      <AnimatePresence>
          {showEditModal && (
            <motion.div
              className="profile-modal-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition}
              onClick={closeEditModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-modal-title"
            >
              <motion.div
                className="profile-modal"
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={transition}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="profile-modal-title" className="profile-modal__title">Escolher foto do perfil</h2>
                <p className="profile-modal__subtitle">Selecione uma das imagens abaixo e clique em Salvar.</p>
                <div className="profile-modal__images">
                  {AVATAR_OPTIONS.map((url) => (
                    <button
                      key={url}
                      type="button"
                      className={`profile-modal__img-wrap ${selectedFoto === url ? 'profile-modal__img-wrap--selected' : ''}`}
                      onClick={() => setSelectedFoto(url)}
                    >
                      <img src={url} alt="" className="profile-modal__img" />
                    </button>
                  ))}
                </div>
                {editError && <p className="profile-modal__error">{editError}</p>}
                <div className="profile-modal__actions">
                  <button type="button" className="profile-button profile-button--secondary" onClick={closeEditModal}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="profile-button profile-button--primary"
                    onClick={handleSaveFoto}
                    disabled={!selectedFoto || saving}
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      <AnimatePresence>
          {showLogoutConfirm && (
            <motion.div
              className="profile-modal-overlay profile-confirm-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition}
              onClick={() => setShowLogoutConfirm(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-confirm-title"
            >
              <motion.div
                className="profile-modal profile-confirm-modal"
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={transition}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="logout-confirm-title" className="profile-modal__title">Sair da conta?</h2>
                <p className="profile-modal__subtitle">Tem certeza que deseja sair?</p>
                <div className="profile-modal__actions">
                  <button type="button" className="profile-button profile-button--secondary" onClick={() => setShowLogoutConfirm(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="profile-button profile-button--primary" onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}>
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

export default Profile
