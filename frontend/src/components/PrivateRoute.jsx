import { useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppContext } from '../context'
import { getMe } from '../services'

/**
 * Redireciona para /login se não houver usuário logado.
 * Hidrata user (foto, config) quando tem token mas config ainda não foi carregado.
 */
export function PrivateRoute({ children }) {
  const { user, setUser } = useAppContext()
  const location = useLocation()
  const hydrated = useRef(false)

  useEffect(() => {
    if (!user?.token || hydrated.current) return
    if (user.config !== undefined) {
      hydrated.current = true
      return
    }
    let cancelled = false
    getMe(user.token)
      .then((me) => {
        if (!cancelled) {
          setUser({
            ...user,
            nome: me.nome,
            foto: me.foto ?? null,
            config: me.config ?? {},
            tabelas: me.tabelas ?? {},
          })
          hydrated.current = true
        }
      })
      .catch(() => {
        if (!cancelled) {
          /* Em 401 o api já chama onUnauthorized (logout + redirect). Não restaurar user aqui. */
        }
      })
    return () => { cancelled = true }
  }, [user?.token])

  if (!user || !user.token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
