/**
 * Constantes e funções puras da página Perfil.
 */

export const AVATAR_OPTIONS = [
  import.meta.env.VITE_AVATAR_OPTION_1 || 'https://png.pngtree.com/png-clipart/20250130/original/pngtree-cartoon-character-with-glasses-png-image_19844612.png',
  import.meta.env.VITE_AVATAR_OPTION_2 || 'https://png.pngtree.com/png-clipart/20250122/original/pngtree-cartoon-character-with-glasses-png-image_19993385.png',
]

export const MOTORISTA_PREFIXOS_DEFAULT = ['TAC', 'MEI', 'ETC']

export const TEMA_OPTIONS = [
  { value: 'claro', label: 'Claro' },
  { value: 'escuro', label: 'Escuro' },
  { value: 'sistema', label: 'Sistema' },
]

export const LINHAS_OPTIONS = [10, 25, 50, 100, 200]

/**
 * URL da foto do utilizador; fallback null se inválida.
 */
export function getAvatarUrl(user) {
  const url = user?.foto || user?.avatar || import.meta.env.VITE_PROFILE_AVATAR_URL || null
  if (!url || url.includes('exemplo.com')) return null
  return url
}

/**
 * Normaliza motorista_prefixos_correio da config para array de strings.
 */
export function getMotoristaPrefixosCorreio(config) {
  const raw = config?.motorista_prefixos_correio
  if (Array.isArray(raw)) return raw.map((p) => (p != null ? String(p).trim() : '')).filter(Boolean)
  if (raw != null && raw !== '') return [String(raw).trim()]
  return []
}

/**
 * Monta o objeto config completo para enviar ao backend.
 */
export function getFullConfig(config, override = {}) {
  const prefixos = getMotoristaPrefixosCorreio(config)
  return {
    tema: config?.tema ?? 'sistema',
    linhas_por_pagina: config?.linhas_por_pagina ?? 25,
    motorista_prefixos_correio: prefixos,
    auto_enviar_motorista_apos_import: !!config?.auto_enviar_motorista_apos_import,
    ...override,
  }
}
