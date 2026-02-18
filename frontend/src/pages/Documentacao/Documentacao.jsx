import './Documentacao.css'

function Documentacao() {
  const rotas = [
    {
      metodo: 'POST',
      endpoint: '/api/importe-tabela-sla',
      descricao: 'Importar tabela SLA - Cria nova coleção sla_tabela',
      flexivel: true,
      colunasObrigatorias: [
        'Base de entrega',
        'Responsável pela entrega',
        'Marca de assinatura',
        'Horário de saída para entrega',
        'Cidade destino',
        'Número de pedido JMS'
      ],
      observacoes: 'Aceita outras colunas além das obrigatórias. Usado para cálculo de SLA.'
    },
    {
      metodo: 'POST',
      endpoint: '/api/importe-tabela-sla/atualizar',
      descricao: 'Atualizar tabela SLA - Atualiza coleção sla_tabela existente',
      flexivel: true,
      colunasObrigatorias: [
        'Base de entrega',
        'Responsável pela entrega',
        'Marca de assinatura',
        'Horário de saída para entrega',
        'Cidade destino',
        'Número de pedido JMS'
      ],
      observacoes: 'Mesmo formato do importe inicial. Aceita outras colunas além das obrigatórias.'
    },
    {
      metodo: 'POST',
      endpoint: '/api/importe-tabela-sla/entrada-galpao',
      descricao: 'Importar entrada no galpão - Cria/atualiza coleção entrada_no_galpao',
      flexivel: false,
      colunasObrigatorias: [
        'Número de pedido JMS',
        'Tipo de bipagem',
        'Tempo de digitalização',
        'Base de escaneamento',
        'Digitalizador'
      ],
      observacoes: 'IMPORTANTE: Apenas estas 5 colunas são salvas. Outras colunas do Excel são ignoradas.'
    },
    {
      metodo: 'POST',
      endpoint: '/api/importe-tabela-pedidos',
      descricao: 'Importar tabela de pedidos - Cria/atualiza coleção pedidos',
      flexivel: true,
      colunasObrigatorias: [
        'Número de pedido JMS',
        'Tempo de digitalização'
      ],
      observacoes: 'Aceita outras colunas além das obrigatórias. Para cada JMS, mantém apenas a linha com "Tempo de digitalização" mais recente.'
    },
    {
      metodo: 'POST',
      endpoint: '/api/importe-tabela-consulta-bipagems',
      descricao: 'Importar consulta das bipagems - Cria/atualiza coleção pedidos_com_status',
      flexivel: true,
      colunasObrigatorias: [
        'Número de pedido JMS',
        'Tempo de digitalização'
      ],
      observacoes: 'Aceita outras colunas além das obrigatórias. Exclui linhas com "Tipo de bipagem" = "Assinatura de encomenda". Para cada JMS, mantém apenas a linha com "Tempo de digitalização" mais recente.'
    },
    {
      metodo: 'POST',
      endpoint: '/api/lista-telefones',
      descricao: 'Importar lista de telefones - Cria/atualiza coleção lista_telefones',
      flexivel: true,
      colunasObrigatorias: [],
      observacoes: 'Totalmente flexível. Aceita qualquer estrutura de colunas. Procura por colunas "Motorista", "HUB" e "Contato" (case-insensitive) mas não são obrigatórias.'
    },
    {
      metodo: 'POST',
      endpoint: '/api/resultados-consulta/motorista/atualizar',
      descricao: 'Atualizar motorista por arquivo - Atualiza documentos na coleção motorista',
      flexivel: true,
      colunasObrigatorias: [
        'Número de pedido JMS',
        'Marca de assinatura'
      ],
      observacoes: 'Aceita outras colunas além das obrigatórias. Apenas atualiza documentos existentes na coleção motorista com "Marca de assinatura" igual a valores de entrega.'
    }
  ]

  const paginas = [
    {
      nome: 'Home',
      rota: '/',
      descricao: 'Página inicial com acesso rápido às funcionalidades principais'
    },
    {
      nome: 'Lista de Telefones',
      rota: '/lista-telefones',
      descricao: 'Gerencia lista de telefones dos motoristas. Aceita upload de Excel totalmente flexível.'
    },
    {
      nome: 'Verificar Pedidos Parados',
      rota: '/verificar-pedidos-parados',
      descricao: 'Importa tabela de pedidos. Requer: "Número de pedido JMS" e "Tempo de digitalização". Aceita outras colunas.'
    },
    {
      nome: 'Consultar Pedidos',
      rota: '/consultar-pedidos',
      descricao: 'Importa consulta das bipagems. Requer: "Número de pedido JMS" e "Tempo de digitalização". Aceita outras colunas.'
    },
    {
      nome: 'Resultados Consulta',
      rota: '/resultados-consulta',
      descricao: 'Área de trabalho para visualizar e gerenciar resultados da consulta'
    },
    {
      nome: 'Evolução',
      rota: '/resultados-consulta/evolucao',
      descricao: 'Visualiza evolução dos pedidos ao longo do tempo'
    },
    {
      nome: 'SLA',
      rota: '/sla',
      descricao: 'Cálculo e visualização de SLA. Requer upload de tabela SLA com colunas específicas. Aceita outras colunas.'
    },
    {
      nome: 'SLA Performance',
      rota: '/sla/performance',
      descricao: 'Visualiza performance de SLA por base'
    },
    {
      nome: 'Análise',
      rota: '/sla/analise',
      descricao: 'Análise detalhada de dados de SLA'
    },
    {
      nome: 'Perfil',
      rota: '/perfil',
      descricao: 'Configurações do perfil do usuário'
    }
  ]

  return (
    <section className="documentacao-page">
      <div className="documentacao-container">
        <div className='documentacao-header'>
          <h1 className="documentacao-title">Documentação - Rotas e Páginas</h1>
          <h2 className="documentacao-section-title">Rotas de Upload (POST)</h2>
          <p className="documentacao-intro">
            Todas as rotas de upload recebem arquivos Excel (.xlsx).
            As colunas são identificadas por nome (case-insensitive, sem acentos).
          </p>
        </div>
        <section className="documentacao-section">
          {rotas.map((rota, index) => (
            <div key={index} className="documentacao-card">
              <div className="documentacao-card-header">
                <span className="documentacao-method documentacao-method--post">{rota.metodo}</span>
                <code className="documentacao-endpoint">{rota.endpoint}</code>
                <span className={`documentacao-flexivel ${rota.flexivel ? 'documentacao-flexivel--sim' : 'documentacao-flexivel--nao'}`}>
                  {rota.flexivel ? 'Flexível' : 'Fixo'}
                </span>
              </div>

              <p className="documentacao-descricao">{rota.descricao}</p>

              {rota.colunasObrigatorias.length > 0 && (
                <div className="documentacao-colunas">
                  <h3 className="documentacao-colunas-title">Colunas Obrigatórias:</h3>
                  <ul className="documentacao-colunas-list">
                    {rota.colunasObrigatorias.map((coluna, idx) => (
                      <li key={idx} className="documentacao-coluna-item">
                        <code>{coluna}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {rota.colunasObrigatorias.length === 0 && (
                <div className="documentacao-colunas">
                  <h3 className="documentacao-colunas-title">Colunas Obrigatórias:</h3>
                  <p className="documentacao-sem-colunas">Nenhuma coluna obrigatória. Totalmente flexível.</p>
                </div>
              )}

              {rota.observacoes && (
                <div className="documentacao-observacoes">
                  <strong>Observações:</strong> {rota.observacoes}
                </div>
              )}
            </div>
          ))}
        </section>

        <section className="documentacao-section">
          <h2 className="documentacao-section-title">Páginas do Frontend</h2>

          {paginas.map((pagina, index) => (
            <div key={index} className="documentacao-card documentacao-card--pagina">
              <div className="documentacao-card-header">
                <code className="documentacao-rota">{pagina.rota}</code>
              </div>
              <h3 className="documentacao-pagina-nome">{pagina.nome}</h3>
              <p className="documentacao-descricao">{pagina.descricao}</p>
            </div>
          ))}
        </section>

        <section className="documentacao-section">
          <h2 className="documentacao-section-title">Notas Importantes</h2>
          <div className="documentacao-notas">
            <ul>
              <li>
                <strong>Flexível:</strong> A rota aceita outras colunas além das obrigatórias.
                Todas as colunas do Excel serão salvas no banco de dados.
              </li>
              <li>
                <strong>Fixo:</strong> A rota aceita apenas as colunas especificadas.
                Outras colunas do Excel serão ignoradas durante o upload.
              </li>
              <li>
                <strong>Case-insensitive:</strong> Os nomes das colunas são comparados sem diferenciação
                de maiúsculas/minúsculas e sem acentos.
              </li>
              <li>
                <strong>Deduplicação:</strong> Algumas rotas mantêm apenas o registro mais recente
                baseado em "Tempo de digitalização" para cada "Número de pedido JMS".
              </li>
              <li>
                <strong>Validação:</strong> Se uma coluna obrigatória não for encontrada,
                o upload retornará erro 400 com mensagem descritiva.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </section>
  )
}

export default Documentacao
