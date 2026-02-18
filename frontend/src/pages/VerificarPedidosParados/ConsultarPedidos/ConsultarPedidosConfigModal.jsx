import { useState, useRef, useEffect } from 'react'
import { useAppContext } from '../../../context'
import { updateConfig } from '../../../services'
import { getMotoristaPrefixosCorreio, getFullConfig } from '../../Profile/Profile.js'
import './ConsultarPedidosConfigModal.css'

/**
 * Modal com a configuração de envio ao Motorista (prefixos + enviar automaticamente).
 * Usa a mesma config do perfil do utilizador (user.config).
 */
export default function ConsultarPedidosConfigModal({ open, onClose }) {
  const { user, setUser } = useAppContext()
  const config = user?.config ?? {}
  const motoristaPrefixosCorreio = getMotoristaPrefixosCorreio(config)
  const autoEnviarMotoristaAposImport = !!config.auto_enviar_motorista_apos_import

  const [novoPrefixoInput, setNovoPrefixoInput] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [configError, setConfigError] = useState('')
  const [openConfigDropdown, setOpenConfigDropdown] = useState(null)
  const [prefixosSelecionadosParaRemover, setPrefixosSelecionadosParaRemover] = useState([])
  const [prefixosAConfirmarRemocao, setPrefixosAConfirmarRemocao] = useState([])
  const configDropdownRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setConfigError('')
    setNovoPrefixoInput('')
    setOpenConfigDropdown(null)
    setPrefixosSelecionadosParaRemover([])
    setPrefixosAConfirmarRemocao([])
  }, [open])

  useEffect(() => {
    if (openConfigDropdown == null) return
    function handleClickOutside(e) {
      if (e.target.closest('.consultar-pedidos-config__trigger')) return
      if (configDropdownRef.current?.contains(e.target)) return
      setOpenConfigDropdown(null)
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [openConfigDropdown])

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

  function handleAddPrefixo() {
    const valor = (novoPrefixoInput || '').trim()
    if (!valor) return
    const novaLista = [...motoristaPrefixosCorreio]
    if (novaLista.includes(valor)) return
    novaLista.push(valor)
    handleConfigChange('motorista_prefixos_correio', novaLista)
    setNovoPrefixoInput('')
  }

  function handleRemovePrefixo(prefixoRemover) {
    const novaLista = motoristaPrefixosCorreio.filter((p) => p !== prefixoRemover)
    handleConfigChange('motorista_prefixos_correio', novaLista)
  }

  function togglePrefixoParaRemover(prefixo) {
    setPrefixosSelecionadosParaRemover((prev) =>
      prev.includes(prefixo) ? prev.filter((p) => p !== prefixo) : [...prev, prefixo]
    )
  }

  function handleRemoverPrefixosSelecionados() {
    if (prefixosSelecionadosParaRemover.length === 0) return
    setPrefixosAConfirmarRemocao([...prefixosSelecionadosParaRemover])
    setOpenConfigDropdown(null)
  }

  function handleConfirmarRemocaoPrefixos() {
    if (prefixosAConfirmarRemocao.length === 0) return
    const novaLista = motoristaPrefixosCorreio.filter((p) => !prefixosAConfirmarRemocao.includes(p))
    handleConfigChange('motorista_prefixos_correio', novaLista)
    setPrefixosAConfirmarRemocao([])
    setPrefixosSelecionadosParaRemover([])
  }

  function abrirModalRemoverUmPrefixo(prefixo) {
    setPrefixosAConfirmarRemocao([prefixo])
  }

  function handleAutoEnviarChange(e) {
    handleConfigChange('auto_enviar_motorista_apos_import', !!e.target.checked)
  }

  if (!open) return null

  return (
    <>
      <div
        className="consultar-pedidos-config-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consultar-pedidos-config-title"
        onClick={onClose}
      >
        <div
          className="consultar-pedidos-config-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="consultar-pedidos-config-modal__header">
            <h2 id="consultar-pedidos-config-title" className="consultar-pedidos-config-modal__title">
              Configuração
            </h2>
            <button
              type="button"
              className="consultar-pedidos-config-modal__close"
              onClick={onClose}
              aria-label="Fechar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="consultar-pedidos-config-modal__desc">
            Critério para envio ao Motorista e opção de envio automático após importar a planilha. As alterações ficam salvas na sua conta (perfil).
          </p>

          {configError && (
            <p className="consultar-pedidos-config-modal__error">{configError}</p>
          )}

          <div className="consultar-pedidos-config-modal__body" ref={configDropdownRef}>
            <div className="consultar-pedidos-config__row consultar-pedidos-config__row--block">
              <label className="consultar-pedidos-config__label" id="config-prefixos-correio-label">
                Critério para envio ao Motorista
              </label>
              <p className="consultar-pedidos-config__hint">
                Pedidos com <strong>Digitalizador</strong> e <strong>Correio de coleta ou entrega</strong> (conforme critério) são enviados ao motorista. Prefixos abaixo são os que estão salvos na sua conta; se a lista estiver vazia, o sistema usa por padrão: TAC, MEI, ETC.
              </p>
              <div className="consultar-pedidos-config__tipos-wrap">
                <div className="consultar-pedidos-config__add-row">
                  <input
                    type="text"
                    className="consultar-pedidos-config__input"
                    value={novoPrefixoInput}
                    onChange={(e) => setNovoPrefixoInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPrefixo())}
                    placeholder="ex.: TAC, MEI ou ETC"
                    disabled={savingConfig}
                    aria-label="Adicionar prefixo do Correio para motorista"
                  />
                  <button
                    type="button"
                    className="consultar-pedidos-config__btn-add"
                    onClick={handleAddPrefixo}
                    disabled={savingConfig || !novoPrefixoInput.trim()}
                  >
                    Adicionar
                  </button>
                </div>
                {motoristaPrefixosCorreio.length === 0 && (
                  <p className="consultar-pedidos-config__hint consultar-pedidos-config__tipos-hint">
                    Nenhum prefixo salvo na sua conta. O sistema usa por padrão: TAC, MEI, ETC. Adicione acima para personalizar e salvar.
                  </p>
                )}
                {motoristaPrefixosCorreio.length > 0 && (
                  <>
                    <div className="consultar-pedidos-config__remove-row">
                      <label className="consultar-pedidos-config__label consultar-pedidos-config__remove-label" id="config-remover-prefixo-label">
                        Remover prefixo
                      </label>
                      <div className="consultar-pedidos-config__dropdown-wrap">
                        <button
                          type="button"
                          className="consultar-pedidos-config__trigger"
                          onClick={() => setOpenConfigDropdown((v) => (v === 'removerPrefixo' ? null : 'removerPrefixo'))}
                          disabled={savingConfig}
                          aria-expanded={openConfigDropdown === 'removerPrefixo'}
                          aria-haspopup="listbox"
                          aria-labelledby="config-remover-prefixo-label"
                        >
                          <span className="consultar-pedidos-config__trigger-label">
                            {prefixosSelecionadosParaRemover.length > 0
                              ? `${prefixosSelecionadosParaRemover.length} selecionado(s)`
                              : '— Selecione para remover —'}
                          </span>
                          <svg className="consultar-pedidos-config__trigger-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        {openConfigDropdown === 'removerPrefixo' && (
                          <div className="consultar-pedidos-config__panel consultar-pedidos-config__panel--remover" role="listbox" aria-labelledby="config-remover-prefixo-label">
                            <div className="consultar-pedidos-config__panel-inner">
                              <div className="consultar-pedidos-config__option-list consultar-pedidos-config__option-list--checkboxes">
                                {motoristaPrefixosCorreio.map((p) => (
                                  <label
                                    key={p}
                                    className={`consultar-pedidos-config__option consultar-pedidos-config__option--checkbox ${prefixosSelecionadosParaRemover.includes(p) ? 'consultar-pedidos-config__option--selected' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={prefixosSelecionadosParaRemover.includes(p)}
                                      onChange={() => togglePrefixoParaRemover(p)}
                                      className="consultar-pedidos-config__option-checkbox"
                                      aria-label={`Selecionar ${p} para remover`}
                                    />
                                    <span className="consultar-pedidos-config__option-text">{p}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="consultar-pedidos-config__panel-actions">
                              <button
                                type="button"
                                className="consultar-pedidos-config__btn-remover-selecionados"
                                onClick={handleRemoverPrefixosSelecionados}
                                disabled={prefixosSelecionadosParaRemover.length === 0 || savingConfig}
                              >
                                Remover selecionados ({prefixosSelecionadosParaRemover.length})
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <ul className="consultar-pedidos-config__list" aria-label="Prefixos configurados">
                      {motoristaPrefixosCorreio.map((p) => (
                        <li key={p} className="consultar-pedidos-config__list-item">
                          <span className="consultar-pedidos-config__list-text">{p}</span>
                          <button
                            type="button"
                            className="consultar-pedidos-config__btn-remove"
                            onClick={() => abrirModalRemoverUmPrefixo(p)}
                            disabled={savingConfig}
                            aria-label={`Remover ${p}`}
                            title="Remover"
                          >
                            Remover
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

            <div className="consultar-pedidos-config__row">
              <label className="consultar-pedidos-config__label consultar-pedidos-config__label--checkbox" htmlFor="consultar-pedidos-config-auto-enviar">
                <input
                  id="consultar-pedidos-config-auto-enviar"
                  type="checkbox"
                  className="consultar-pedidos-config__checkbox"
                  checked={autoEnviarMotoristaAposImport}
                  onChange={handleAutoEnviarChange}
                  disabled={savingConfig}
                />
                <span>Enviar automaticamente para motorista após importar planilha</span>
              </label>
              <p className="consultar-pedidos-config__hint">
                Se ativo e existir pelo menos um prefixo acima, ao importar pedidos consultados o sistema envia para motorista os pedidos que atendem ao critério (Digitalizador + Correio com prefixo).
              </p>
            </div>
          </div>

          {savingConfig && <p className="consultar-pedidos-config-modal__saving">Salvando…</p>}

          <div className="consultar-pedidos-config-modal__actions">
            <button
              type="button"
              className="consultar-pedidos-config-modal__btn consultar-pedidos-config-modal__btn--primary"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmação de remoção de prefixos */}
      {prefixosAConfirmarRemocao.length > 0 && (
        <div
          className="consultar-pedidos-config-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consultar-pedidos-config-confirm-title"
          onClick={() => setPrefixosAConfirmarRemocao([])}
        >
          <div className="consultar-pedidos-config-modal consultar-pedidos-config-modal--confirm" onClick={(e) => e.stopPropagation()}>
            <h2 id="consultar-pedidos-config-confirm-title" className="consultar-pedidos-config-modal__title">
              Remover {prefixosAConfirmarRemocao.length} prefixo(s)?
            </h2>
            <p className="consultar-pedidos-config-modal__subtitle">
              Os seguintes prefixos serão removidos da lista:
            </p>
            <ul className="consultar-pedidos-config-modal__tipos-list">
              {prefixosAConfirmarRemocao.map((p) => (
                <li key={p} className="consultar-pedidos-config-modal__tipos-list-item">{p}</li>
              ))}
            </ul>
            <div className="consultar-pedidos-config-modal__actions">
              <button
                type="button"
                className="consultar-pedidos-config-modal__btn consultar-pedidos-config-modal__btn--secondary"
                onClick={() => setPrefixosAConfirmarRemocao([])}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="consultar-pedidos-config-modal__btn consultar-pedidos-config-modal__btn--primary"
                onClick={handleConfirmarRemocaoPrefixos}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
