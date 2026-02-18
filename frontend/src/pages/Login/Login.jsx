import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon } from '../../components/icons'
import { useAppContext, useNotification } from '../../context'
import { performLogin } from './Login.js'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const { setUser } = useAppContext()
  const { showNotification } = useNotification()
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const result = await performLogin(
        { nome, senha },
        { setUser, showNotification, navigate }
      )
      if (result.error) setErro(result.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <h1 className="login-title">Entrar</h1>
        <p className="login-subtitle">
          Novo por aqui? <Link to="/criar-conta" className="login-link">Criar conta</Link>
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-input-wrap">
            <UserIcon className="login-icon" />
            <input
              type="text"
              className="login-input"
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="login-input-wrap has-toggle">
            <LockIcon className="login-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              className="login-input"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            <button
              type="button"
              className="login-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <a href="#forgot" className="login-forgot">Esqueceu a senha?</a>
          {erro && <p className="login-erro">{erro}</p>}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-separator">ou</div>

        <p className="login-footer">
          Ao entrar com uma conta, você concorda com os<br />
          <a href="#terms">Termos de Serviço</a> e <a href="#privacy">Política de Privacidade</a>.
        </p>
      </div>
    </section>
  )
}

export default Login
