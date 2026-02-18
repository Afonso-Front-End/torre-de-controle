/**
 * Cache em memória da página Resultados da consulta.
 * Permite invalidar de outros módulos (ex.: ConsultarPedidos após enviar para motorista).
 */
let cachedResultadosKey = null
let cachedResultadosData = []
let cachedResultadosTotal = 0

export function getResultadosCache() {
  return { cachedResultadosKey, cachedResultadosData, cachedResultadosTotal }
}

export function setResultadosCache(key, data, total) {
  cachedResultadosKey = key
  cachedResultadosData = data
  cachedResultadosTotal = total
}

export function invalidateResultadosCache() {
  cachedResultadosKey = null
  cachedResultadosData = []
  cachedResultadosTotal = 0
}
