/**
 * Lógica e constantes da página Criar conta.
 */
import { criarConta } from '../../services'
import { CRIAR_CONTA } from '../../notifications'

/**
 * Valida e cria conta; em sucesso notifica e navega para /login.
 * @param {{ nome: string, nomeBase: string, senha: string, repitaSenha: string }} data
 * @param {{ showNotification: (msg, type) => void, navigate: (path, opts?) => void }} deps
 * @returns {Promise<{ success: boolean, error?: string, erroSenha?: string }>}
 */
export async function submitCreateAccount(data, deps) {
  const { nome, nomeBase, senha, repitaSenha } = data
  const { showNotification, navigate } = deps

  if (senha !== repitaSenha) {
    showNotification(CRIAR_CONTA.SENHAS_DIFERENTES, 'error')
    return { success: false, erroSenha: CRIAR_CONTA.SENHAS_DIFERENTES }
  }

  try {
    await criarConta(nome, nomeBase, senha)
    showNotification(CRIAR_CONTA.SUCCESS, 'success')
    navigate('/login', { replace: true })
    return { success: true }
  } catch (err) {
    const msg = err.message || CRIAR_CONTA.ERROR_GENERIC
    showNotification(msg, 'error')
    return { success: false, error: msg }
  }
}
