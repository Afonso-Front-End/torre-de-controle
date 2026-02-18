import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../../context'
import './Header.css'

function getAvatarUrl(user) {
  const url = user?.foto || user?.avatar || null
  if (!url || url.includes('exemplo.com')) return null
  return url
}

export function Header() {
  const { user } = useAppContext()
  const [avatarError, setAvatarError] = useState(false)
  const avatarUrl = getAvatarUrl(user)
  const showImg = avatarUrl && !avatarError
  const initial = user?.nome?.charAt(0)?.toUpperCase() || '?'

  return (
    <header className="layout-header">
      <div className="layout-header__inner">
        <span className="layout-header__title">Torre de Controle</span>
        <Link to="/perfil" className="layout-header__profile" aria-label="Ver perfil">
          <span className="layout-header__profile-avatar">
            {showImg ? (
              <img
                src={avatarUrl}
                alt=""
                className="layout-header__profile-img"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span className="layout-header__profile-initial" aria-hidden>{initial}</span>
            )}
          </span>
          <span className="layout-header__profile-name">{user?.nome ?? 'Perfil'}</span>
        </Link>
      </div>
    </header>
  )
}
