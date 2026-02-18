import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon } from '../../components/icons'
import { useNotification } from '../../context'
import { submitCreateAccount } from './CreateAccount.js'
import './CreateAccount.css'

function CreateAccount() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [nome, setNome] = useState('')
  const [nomeBase, setNomeBase] = useState('')
  const [senha, setSenha] = useState('')
  const [repitaSenha, setRepitaSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRepitaSenha, setShowRepitaSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setErroSenha('')
    setLoading(true)
    try {
      const result = await submitCreateAccount(
        { nome, nomeBase, senha, repitaSenha },
        { showNotification, navigate }
      )
      if (result.erroSenha) setErroSenha(result.erroSenha)
      if (result.error) setErro(result.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="create-account-page">
      <div className="create-account-card">
        <h1 className="create-account-title">Criar conta</h1>
        <p className="create-account-subtitle">
          Já tem conta? <Link to="/login" className="create-account-link">Entrar</Link>
        </p>

        <form className="create-account-form" onSubmit={handleSubmit}>
          <div className="create-account-input-wrap">
            <UserIcon className="create-account-icon" />
            <input
              type="text"
              className="create-account-input"
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="create-account-input-wrap">
            <UserIcon className="create-account-icon" />
            <input
              type="text"
              className="create-account-input create-account-input--uppercase"
              placeholder="Nome da base"
              value={nomeBase}
              onChange={(e) => setNomeBase(e.target.value.toUpperCase())}
              required
            />
          </div>
          <div className="create-account-input-wrap has-toggle">
            <LockIcon className="create-account-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              className="create-account-input"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            <button
              type="button"
              className="create-account-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <div className="create-account-input-wrap has-toggle">
            <LockIcon className="create-account-icon" />
            <input
              type={showRepitaSenha ? 'text' : 'password'}
              className="create-account-input"
              placeholder="Repita senha"
              value={repitaSenha}
              onChange={(e) => setRepitaSenha(e.target.value)}
              required
            />
            <button
              type="button"
              className="create-account-toggle"
              onClick={() => setShowRepitaSenha(!showRepitaSenha)}
              aria-label={showRepitaSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showRepitaSenha ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {erroSenha && <p className="create-account-erro">{erroSenha}</p>}
          {erro && <p className="create-account-erro">{erro}</p>}
          <button type="submit" className="create-account-button" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <div className="create-account-separator">ou</div>

        <p className="create-account-social-label">Entre com sua rede social favorita</p>

        <p className="create-account-footer">
          Ao criar uma conta, você concorda com os<br />
          <a href="#terms">Termos de Serviço</a> e <a href="#privacy">Política de Privacidade</a>.
        </p>
      </div>
    </section>
  )
}

export default CreateAccount
