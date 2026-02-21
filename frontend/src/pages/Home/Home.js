/**
 * Constantes e lógica da página Home.
 */
import { MdOutlineContactPhone, MdSchedule, MdPersonOutline, MdAccessTime } from 'react-icons/md'

export const ACESSO_RAPIDO = [
  {
    to: '/lista-telefones',
    icon: MdOutlineContactPhone,
    title: 'Lista de telefones',
    desc: 'Ver e gerir contactos por planilha',
  },
  {
    to: '/verificar-pedidos-parados',
    icon: MdSchedule,
    title: 'Verificar pedidos',
    desc: 'Importar tabela e verificar pedidos parados',
  },
  {
    to: '/sla',
    icon: MdAccessTime,
    title: 'SLA',
    desc: 'Acompanhar prazos e indicadores de entrega',
  },
  {
    to: '/perfil',
    icon: MdPersonOutline,
    title: 'Perfil',
    desc: 'Dados da conta e foto',
  },
]
