import { useNotification } from '../../context'
import { InfoIcon, BellIcon, CheckIcon, WarningIcon, ErrorIcon } from './NotificationIcons'
import './Notification.css'

const ICONS = {
  neutral: InfoIcon,
  info: BellIcon,
  success: CheckIcon,
  warning: WarningIcon,
  error: ErrorIcon,
}

export function Notification() {
  const { notification, hideNotification } = useNotification()
  const { title, description, type, visible } = notification

  if (!visible || !title) return null

  const Icon = ICONS[type] || ICONS.neutral

  return (
    <div
      role="alert"
      className={`notification notification--${type}`}
    >
      <div className="notification__icon-wrap">
        <Icon className="notification__icon" />
      </div>
      <div className="notification__content">
        <p className="notification__title">{title}</p>
        {description && <p className="notification__description">{description}</p>}
      </div>
      <button
        type="button"
        className="notification__close"
        onClick={hideNotification}
        aria-label="Fechar"
      >
        ×
      </button>
    </div>
  )
}
