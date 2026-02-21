import { useState } from 'react'
import SLAImportDrop from '../SLAImportDrop'

/**
 * Área de importação SLA: drop zone + overlay de loading.
 * Quando a lista está a carregar e ainda não há dados nem import em curso, mostra "A carregar…".
 * Caso contrário mostra o drop zone e, durante a importação, o overlay.
 */
export default function SLAImportSection({ token, loadingLista, hasData, onImportSuccess }) {
  const [importing, setImporting] = useState(false)
  const isLoadingInitial = loadingLista && !hasData && !importing

  if (isLoadingInitial) {
    return (
      <section className="sla__enviar" aria-hidden>
        <span className="sla__loading-text">A carregar…</span>
      </section>
    )
  }

  return (
    <section className="sla__enviar">
      <SLAImportDrop
        token={token}
        onImportSuccess={onImportSuccess}
        onLoadingChange={setImporting}
      />
      {importing && (
        <div className="sla__loading-overlay" role="status" aria-live="polite" aria-busy="true">
          <div className="sla__loading-modal">
            <div className="sla__loading-spinner" aria-hidden />
            <p className="sla__loading-title">A importar tabela SLA</p>
            <p className="sla__loading-desc">O ficheiro está a ser processado no servidor. Pode demorar vários minutos em ficheiros grandes.</p>
          </div>
        </div>
      )}
    </section>
  )
}
