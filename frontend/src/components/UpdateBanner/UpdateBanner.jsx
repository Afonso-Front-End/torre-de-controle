import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCheckUpdate } from '../../services'
import './UpdateBanner.css'

const STORAGE_KEY = 'torre_update_dismissed'

/**
 * Compara duas versões no formato semver (ex.: 1.0.0, 1.2.3).
 * Retorna 1 se a > b, -1 se a < b, 0 se iguais.
 */
function compareVersions(a, b) {
  const parse = (v) => (v || '0').replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  const pa = parse(a)
  const pb = parse(b)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

/** Dados fake para pré-visualização do banner (ex.: ?preview=update-banner na URL). */
const PREVIEW_UPDATE = {
  tag_name: 'v1.1.0',
  name: 'v1.1.0 (pré-visualização)',
  html_url: 'https://github.com',
}

export function UpdateBanner() {
  const [searchParams] = useSearchParams()
  const [update, setUpdate] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  const isPreview =
    import.meta.env.DEV && searchParams.get('preview') === 'update-banner'

  useEffect(() => {
    const current = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

    if (isPreview) {
      setUpdate(PREVIEW_UPDATE)
      return
    }

    getCheckUpdate()
      .then((res) => {
        if (import.meta.env.DEV) {
          console.log('[UpdateBanner] Resposta da API:', res)
        }
        if (!res.has_update || !res.version) return
        if (compareVersions(res.version, current) <= 0) return
        const dismissedTag = localStorage.getItem(STORAGE_KEY)
        if (dismissedTag === res.tag_name) return
        setUpdate(res)
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('[UpdateBanner] Erro ao verificar atualização:', err?.message || err)
        }
      })
  }, [isPreview])

  const handleDismiss = () => {
    if (!isPreview && update?.tag_name) {
      localStorage.setItem(STORAGE_KEY, update.tag_name)
    }
    setDismissed(true)
    setUpdate(null)
  }

  if (!update || dismissed) return null

  return (
    <div className="update-banner" role="alert">
      <span className="update-banner__text">
        Nova versão disponível: <strong>{update.name || update.tag_name}</strong>
      </span>
      <a
        href={update.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="update-banner__link"
      >
        Ver e baixar
      </a>
      <button
        type="button"
        className="update-banner__close"
        onClick={handleDismiss}
        aria-label="Fechar aviso"
      >
        ✕
      </button>
    </div>
  )
}
