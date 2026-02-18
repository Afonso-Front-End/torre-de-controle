import { useState, useRef, useCallback } from 'react'
import { useNotification } from '../../../../context'
import { salvarSLATabela } from '../../../../services'

/**
 * Hook para o fluxo de import de ficheiro na página SLA.
 * Chama a API salvarSLATabela e, em sucesso, invoca onSuccess (ex.: refetch da tabela).
 * Mantém loading true até onSuccess terminar, para o modal de carregamento cobrir todo o fluxo.
 * @param {string} [token] - JWT (Bearer)
 * @param {() => void | Promise<void>} [onSuccess] - Callback após import com sucesso (ex.: refetch)
 * @param {(boolean) => void} [onLoadingChange] - Callback quando o estado de envio muda (para modal no pai)
 * @returns { { loading, inputRef, handleArquivo } }
 */
export function useSLAImport(token, onSuccess, onLoadingChange) {
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  const handleArquivo = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const ext = (file.name || '').toLowerCase()
      if (!ext.endsWith('.xlsx')) {
        showNotification?.('Envie um arquivo Excel (.xlsx).', 'error')
        e.target.value = ''
        return
      }
      if (!token) {
        showNotification?.('Sessão expirada. Faça login novamente.', 'error')
        return
      }
      setLoading(true)
      onLoadingChange?.(true)
      try {
        const res = await salvarSLATabela(token, file)
        const saved = res.saved ?? 0
        showNotification?.(`${saved} linha(s) importada(s) para SLA.`, 'success')
        if (inputRef.current) inputRef.current.value = ''
        await onSuccess?.()
      } catch (err) {
        showNotification?.(err.message || 'Erro ao importar o Excel.', 'error')
      } finally {
        setLoading(false)
        onLoadingChange?.(false)
        e.target.value = ''
      }
    },
    [token, showNotification, onSuccess, onLoadingChange]
  )

  return { loading, inputRef, handleArquivo }
}
