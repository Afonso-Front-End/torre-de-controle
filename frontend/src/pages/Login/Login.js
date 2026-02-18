/**
 * Lógica e constantes da página Login.
 */
import { login as apiLogin, getMe } from '../../services'
import { LOGIN } from '../../notifications'

/**
 * Efetua login: chama API, obtém /me, atualiza user no contexto e navega.
 * @param {{ nome: string, senha: string }} credentials
 * @param {{ setUser: (u) => void, showNotification: (msg, type) => void, navigate: (path, opts?) => void }} deps
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function performLogin(credentials, deps) {
  const { nome, senha } = credentials
  const { setUser, showNotification, navigate } = deps
  try {
    const data = await apiLogin(nome, senha)
    const token = data.access_token
    try {
      const me = await getMe(token)
      setUser({
        token,
        nome: me.nome,
        foto: me.foto ?? null,
        config: me.config ?? {},
      })
    } catch {
      setUser({ token, nome })
    }
    showNotification(LOGIN.SUCCESS, 'success')
    navigate('/', { replace: true })
    return { success: true }
  } catch (err) {
    const msg = err.message || LOGIN.ERROR_GENERIC
    showNotification(msg, 'error')
    return { success: false, error: msg }
  }
}
