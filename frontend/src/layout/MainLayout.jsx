import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAppContext } from '../context'
import Loader from '../components/Loader'
import { UpdateBanner } from '../components/UpdateBanner/UpdateBanner'
import { Header } from './Header/Header'
import { Sidebar } from './Sidebar/Sidebar'
import './Layout.css'

function MainLayout() {
  const { globalLoading, setGlobalLoading } = useAppContext()
  const location = useLocation()

  /* Limpa o loading global ao mudar de página, para não ficar o overlay preso noutra rota. */
  useEffect(() => {
    setGlobalLoading(false)
  }, [location.pathname, setGlobalLoading])

  return (
    <div className="layout">
      <UpdateBanner />
      <Header />
      <div className="layout__body">
        <Sidebar />
        <main className="layout__main layout__main--relative">
          <Outlet />
          {globalLoading.show && (
            <Loader variant="overlay" text={globalLoading.text} className="layout__global-loader" />
          )}
        </main>
      </div>
    </div>
  )
}

export default MainLayout
