import './Loader.css'

/**
 * Loader global reutilizável: spinner + texto opcional.
 * @param {string} [text] - Texto exibido junto ao spinner (ex.: "Carregando…")
 * @param {'default' | 'sm'} [size='default'] - Tamanho do spinner (default 40px, sm 20px)
 * @param {'default' | 'overlay' | 'inline' | 'row'} [variant='default'] - default: bloco 240px; overlay: 100% por cima do conteúdo (pai com position: relative); inline: 160px; row: flex row (dropdown)
 * @param {string} [className] - Classe adicional no wrapper
 * @param {boolean} [busy] - Se true, adiciona aria-busy e aria-live no wrapper
 */
export default function Loader({ text, size = 'default', variant = 'default', className = '', busy = false }) {
  const rootClass = [
    'loader',
    variant !== 'default' ? `loader--${variant}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const spinnerClass = size === 'sm' ? 'loader__spinner loader__spinner--sm' : 'loader__spinner'

  return (
    <div
      className={rootClass}
      role="status"
      aria-live={busy ? 'polite' : undefined}
      aria-busy={busy ? true : undefined}
      aria-label={text || 'A carregar'}
    >
      <div className={spinnerClass} aria-hidden />
      {text && <p className="loader__text">{text}</p>}
    </div>
  )
}
