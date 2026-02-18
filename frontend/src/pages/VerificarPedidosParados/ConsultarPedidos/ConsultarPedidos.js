/**
 * Constantes e funções puras da página Consultar pedidos.
 */

export const VALID_ROWS_PER_PAGE = [10, 25, 50, 100, 200]

/** Cache em memória: chave por token + datas selecionadas. */
export function getConsultarCacheKey(token, datasParam) {
  return (token || '') + JSON.stringify(datasParam)
}

/** Estado do cache (module-level para persistir ao navegar). */
export const consultarCache = {
  key: null,
  hasData: false,
  status: { header: [], rows: [], total: 0 },
}
