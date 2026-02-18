import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthRedirectOn401 } from './components/AuthRedirectOn401'
import { PrivateRoute } from './components/PrivateRoute'
import { MainLayout } from './layout'
import { Login, CreateAccount, Home, ListaTelefones, VerificarPedidosParados, ConsultarPedidos, ResultadosConsulta, Evolucao, SLA, SLAPerformance, Analise, Profile, Documentacao } from './pages'

function App() {
  return (
    <BrowserRouter>
      <AuthRedirectOn401 />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/criar-conta" element={<CreateAccount />} />
        <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route index element={<Home />} />
          <Route path="lista-telefones" element={<ListaTelefones />} />
          <Route path="verificar-pedidos-parados" element={<VerificarPedidosParados />} />
          <Route path="consultar-pedidos" element={<ConsultarPedidos />} />
          <Route path="resultados-consulta" element={<ResultadosConsulta />} />
          <Route path="resultados-consulta/evolucao" element={<Evolucao />} />
          <Route path="sla" element={<SLA />} />
          <Route path="sla/performance" element={<SLAPerformance />} />
          <Route path="sla/analise" element={<Analise />} />
          <Route path="perfil" element={<Profile />} />
          <Route path="documentacao" element={<Documentacao />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
