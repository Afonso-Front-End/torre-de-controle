import { MdClose, MdCheckBox, MdCheckBoxOutlineBlank } from 'react-icons/md'

export default function SLACidadesFilterDropdown({
  anchorRect,
  refProp,
  searchTerm,
  onSearchChange,
  cidadesOptions,
  selectedCidades,
  onToggleCidade,
  onClear,
  onSelectAll,
  onDeselectAll,
  onPointerDownCapture,
}) {
  if (!anchorRect) return null

  return (
    <div
      ref={refProp}
      className="verificar-pedidos__filter-dropdown verificar-pedidos__filter-dropdown--menu sla__cidades-filter-dropdown-pos sla__cidades-filter-dropdown--fixed"
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 6,
        left: anchorRect.left,
        minWidth: Math.max(anchorRect.width, 240),
        maxWidth: 320,
        height: '70vh',
        maxHeight: 420,
      }}
      onPointerDown={onPointerDownCapture}
    >
      <div className="verificar-pedidos__filter-dropdown-inner">
        <div className="verificar-pedidos__filter-dropdown-search-wrap">
          <input
            type="text"
            className="verificar-pedidos__filter-dropdown-search"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="verificar-pedidos__filter-dropdown-list">
          <div className="verificar-pedidos__filter-menu">
            {cidadesOptions.length === 0 ? (
              <p className="sla__cidades-filter-empty">Nenhuma cidade nos dados.</p>
            ) : (
              cidadesOptions
                .filter((cidade) =>
                  String(cidade).toLowerCase().includes(searchTerm.trim().toLowerCase())
                )
                .map((cidade) => {
                  const checked = selectedCidades.includes(cidade)
                  return (
                    <button
                      key={cidade}
                      type="button"
                      className={`verificar-pedidos__filter-menu-item ${checked ? 'verificar-pedidos__filter-menu-item--selected' : ''}`}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onToggleCidade(cidade)
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <span className="verificar-pedidos__filter-menu-icon" aria-hidden>
                        {checked ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                        )}
                      </span>
                      <span className="verificar-pedidos__filter-menu-text">{cidade}</span>
                    </button>
                  )
                })
            )}
          </div>
        </div>
        <div className="verificar-pedidos__filter-dropdown-footer">
          <div className="verificar-pedidos__filter-menu-separator" />
          <div className="sla__cidades-filter-footer-actions">
            <button
              type="button"
              className="sla__cidades-filter-footer-btn"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClear()
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Limpar"
              aria-label="Limpar"
            >
              <MdClose size={20} aria-hidden />
            </button>
            <button
              type="button"
              className="sla__cidades-filter-footer-btn"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onSelectAll()
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Selecionar todos"
              aria-label="Selecionar todos"
            >
              <MdCheckBox size={20} aria-hidden />
            </button>
            <button
              type="button"
              className="sla__cidades-filter-footer-btn"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDeselectAll()
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Desmarcar todos"
              aria-label="Desmarcar todos"
            >
              <MdCheckBoxOutlineBlank size={20} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
