export default function SLAColumnFilterDropdown({
  anchorRect,
  searchTerm,
  onSearchChange,
  options,
  isSelected,
  onToggle,
  onClear,
  onMouseDownCapture,
}) {
  if (!anchorRect) return null

  return (
    <div
      className="verificar-pedidos__filter-dropdown verificar-pedidos__filter-dropdown--menu verificar-pedidos__filter-dropdown--fixed"
      style={{
        position: 'fixed',
        top: anchorRect.top + 2,
        left: anchorRect.left,
        minWidth: Math.max(anchorRect.width, 200),
      }}
      onMouseDown={onMouseDownCapture}
    >
      <div className="verificar-pedidos__filter-dropdown-inner">
        <div className="verificar-pedidos__filter-dropdown-search-wrap">
          <input
            type="text"
            className="verificar-pedidos__filter-dropdown-search"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="verificar-pedidos__filter-dropdown-list">
          <div className="verificar-pedidos__filter-menu">
            {options.map((optionValue) => {
              const checked = isSelected(optionValue)
              return (
                <button
                  key={optionValue}
                  type="button"
                  className={`verificar-pedidos__filter-menu-item ${checked ? 'verificar-pedidos__filter-menu-item--selected' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggle(optionValue)
                  }}
                >
                  <span className="verificar-pedidos__filter-menu-icon" aria-hidden>
                    {checked ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                    )}
                  </span>
                  <span className="verificar-pedidos__filter-menu-text">{optionValue}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="verificar-pedidos__filter-dropdown-footer">
          <div className="verificar-pedidos__filter-menu-separator" />
          <button
            type="button"
            className="verificar-pedidos__filter-menu-item verificar-pedidos__filter-menu-item--action"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClear()
            }}
          >
            <span className="verificar-pedidos__filter-menu-icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </span>
            <span className="verificar-pedidos__filter-menu-text">Limpar filtro</span>
          </button>
        </div>
      </div>
    </div>
  )
}
