import { createContext, useState, useCallback, useContext, useRef, useEffect } from 'react'
import { getMe } from '../services'

const STORAGE_KEY = 'torre_user'

function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const INITIAL_LOADING = { show: false, text: '' }

export const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUserState] = useState(getStoredUser)
  const [globalLoading, setGlobalLoadingState] = useState(INITIAL_LOADING)
  const userRef = useRef(user)

  useEffect(() => {
    userRef.current = user
  }, [user])

  const setUser = useCallback((data) => {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      setUserState(data)
    } else {
      localStorage.removeItem(STORAGE_KEY)
      setUserState(null)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [setUser])

  /** Atualiza user com dados do servidor (nome, foto, config, tabelas). Referência estável para evitar loop (429) ao usar em useEffect. */
  const refetchUser = useCallback(async () => {
    const u = userRef.current
    if (!u?.token) return
    try {
      const me = await getMe(u.token)
      setUser({
        ...u,
        token: u.token,
        nome: me.nome ?? u.nome,
        foto: me.foto ?? u.foto ?? null,
        config: me.config ?? u.config ?? {},
        tabelas: me.tabelas ?? u.tabelas ?? {},
      })
    } catch {
      /* Em 401 o api já chama onUnauthorized. */
    }
  }, [setUser])

  /** Loading global (overlay). Mostrado no layout; limpo ao mudar de rota para não ficar preso noutra página. */
  const setGlobalLoading = useCallback((show, text = '') => {
    setGlobalLoadingState(show ? { show: true, text: text || 'A carregar…' } : INITIAL_LOADING)
  }, [])

  const value = {
    user,
    setUser,
    logout,
    refetchUser,
    globalLoading,
    setGlobalLoading,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext deve ser usado dentro de AppProvider')
  return ctx
}
