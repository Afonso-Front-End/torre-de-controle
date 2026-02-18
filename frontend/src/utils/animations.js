/**
 * Configuração global de animações (Framer Motion).
 * Transição suave usada em abertura/fechamento em todo o projeto.
 */

/** Duração e easing padrão para abertura/fechamento */
export const transition = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1],
}

/** Variantes para painel que aparece/desaparece (ex.: tabela) */
export const panelVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

/** Variantes para overlay de modal */
export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

/** Variantes para conteúdo do modal (fade + leve scale) */
export const modalContentVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
}
