/**
 * Constantes e lógica da página Home.
 */
import { MdOutlineContactPhone, MdSchedule, MdPersonOutline } from 'react-icons/md'

export const ACESSO_RAPIDO = [
  {
    to: '/lista-telefones',
    icon: MdOutlineContactPhone,
    title: 'Lista de telefones',
    desc: 'Importar e gerir planilhas .xlsx',
  },
  {
    to: '/verificar-pedidos-parados',
    icon: MdSchedule,
    title: 'Verificar pedidos',
    desc: 'Carregar e consultar pedidos',
  },
  {
    to: '/perfil',
    icon: MdPersonOutline,
    title: 'Perfil',
    desc: 'Dados da conta e foto',
  },
]
