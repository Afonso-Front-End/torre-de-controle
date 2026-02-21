import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthRedirectOn401 } from './components/AuthRedirectOn401'
import Loader from './components/Loader'
import { PrivateRoute } from './components/PrivateRoute'
import { MainLayout } from './layout'
import { Login, CreateAccount, Home } from './pages'

/* Lazy loading das páginas pesadas – carregadas só ao navegar para a rota */
const ListaTelefones = lazy(() => import('./pages/ListaTelefones').then(m => ({ default: m.default })))
const VerificarPedidosParados = lazy(() => import('./pages/VerificarPedidosParados').then(m => ({ default: m.VerificarPedidosParados })))
const ConsultarPedidos = lazy(() => import('./pages/VerificarPedidosParados').then(m => ({ default: m.ConsultarPedidos })))
const ResultadosConsulta = lazy(() => import('./pages/VerificarPedidosParados').then(m => ({ default: m.ResultadosConsulta })))
const Evolucao = lazy(() => import('./pages/VerificarPedidosParados').then(m => ({ default: m.Evolucao })))
const SLA = lazy(() => import('./pages/SLA').then(m => ({ default: m.default })))
const SLAPerformance = lazy(() => import('./pages/SLA/SLAPerformance').then(m => ({ default: m.default })))
const Analise = lazy(() => import('./pages/SLA/Analise').then(m => ({ default: m.default })))
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.default })))
const Documentacao = lazy(() => import('./pages/Documentacao/Documentacao').then(m => ({ default: m.default })))

function PageFallback() {
  return <Loader variant="overlay" text="A carregar…" className="app-route-fallback" />
}

function App() {
  return (
    <BrowserRouter>
      <AuthRedirectOn401 />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/criar-conta" element={<CreateAccount />} />
        <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route index element={<Home />} />
          <Route path="lista-telefones" element={<Suspense fallback={<PageFallback />}><ListaTelefones /></Suspense>} />
          <Route path="verificar-pedidos-parados" element={<Suspense fallback={<PageFallback />}><VerificarPedidosParados /></Suspense>} />
          <Route path="consultar-pedidos" element={<Suspense fallback={<PageFallback />}><ConsultarPedidos /></Suspense>} />
          <Route path="resultados-consulta" element={<Suspense fallback={<PageFallback />}><ResultadosConsulta /></Suspense>} />
          <Route path="resultados-consulta/evolucao" element={<Suspense fallback={<PageFallback />}><Evolucao /></Suspense>} />
          <Route path="sla" element={<Suspense fallback={<PageFallback />}><SLA /></Suspense>} />
          <Route path="sla/performance" element={<Suspense fallback={<PageFallback />}><SLAPerformance /></Suspense>} />
          <Route path="sla/analise" element={<Suspense fallback={<PageFallback />}><Analise /></Suspense>} />
          <Route path="perfil" element={<Suspense fallback={<PageFallback />}><Profile /></Suspense>} />
          <Route path="documentacao" element={<Suspense fallback={<PageFallback />}><Documentacao /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
