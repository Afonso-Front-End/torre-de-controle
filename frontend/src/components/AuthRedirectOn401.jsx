import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context'
import { setOnUnauthorized } from '../services/api'

/**
 * Regista o callback para 401: faz logout e redireciona para /login.
 * Deve ser montado dentro de BrowserRouter e AppProvider.
 */
export function AuthRedirectOn401() {
  const navigate = useNavigate()
  const { logout } = useAppContext()

  useEffect(() => {
    setOnUnauthorized(() => {
      logout()
      navigate('/login', { replace: true })
    })
    return () => setOnUnauthorized(null)
  }, [logout, navigate])

  return null
}
