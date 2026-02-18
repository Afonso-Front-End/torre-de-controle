import { createContext, useState, useCallback, useContext, useRef } from 'react'

export const NotificationContext = createContext(null)

const AUTO_HIDE_MS = 5000

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({
    title: '',
    description: '',
    type: 'neutral',
    visible: false,
  })
  const timeoutRef = useRef(null)

  const hideNotification = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    setNotification((prev) => ({ ...prev, visible: false }))
  }, [])

  const showNotification = useCallback((titleOrMessage, type = 'neutral', description = '') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    const title = typeof titleOrMessage === 'string' ? titleOrMessage : titleOrMessage?.title ?? ''
    const desc = description || (typeof titleOrMessage === 'object' ? titleOrMessage?.description : '') || ''
    setNotification({ title, description: desc, type, visible: true })
    timeoutRef.current = setTimeout(() => {
      setNotification((prev) => ({ ...prev, visible: false }))
      timeoutRef.current = null
    }, AUTO_HIDE_MS)
  }, [])

  const value = { notification, showNotification, hideNotification }
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification deve ser usado dentro de NotificationProvider')
  return ctx
}
