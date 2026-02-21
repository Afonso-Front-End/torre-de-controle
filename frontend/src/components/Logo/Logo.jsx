/**
 * Logo J&T EXPRESS.
 * "J&T" recebe a cor via prop (branco ou preto); "EXPRESS" é sempre vermelho.
 */
import './Logo.css'

const EXPRESS_RED = '#e53935'

export function Logo({ jtColor = 'black', className = '', as: Component = 'span', ...rest }) {
  const jtClass = jtColor === 'white' ? 'logo--jt-white' : 'logo--jt-black'

  return (
    <Component
      className={`logo ${jtClass} ${className}`.trim()}
      aria-label="J&T Express"
      {...rest}
    >
      <span className="logo__jt">J&T</span>
      <span className="logo__express" style={{ color: EXPRESS_RED }}> EXPRESS</span>
    </Component>
  )
}
