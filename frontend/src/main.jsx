import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GlobalStyles } from './styles'
import { AppProvider, NotificationProvider } from './context'
import { Notification } from './components/Notification'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalStyles />
    <AppProvider>
      <NotificationProvider>
        <Notification />
        <App />
      </NotificationProvider>
    </AppProvider>
  </StrictMode>,
)
