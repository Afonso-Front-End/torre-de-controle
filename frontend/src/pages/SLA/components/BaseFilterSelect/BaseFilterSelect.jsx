import { useState, useEffect, useRef } from 'react'
import './BaseFilterSelect.css'

/**
 * Select para filtrar por base de entrega.
 * @param {string[]} bases - Lista de nomes de bases (opções)
 * @param {string[]} selectedBases - Bases selecionadas
 * @param {(bases: string[]) => void} onChange
 * @param {boolean} [singleSelect] - Se true, apenas uma base pode estar selecionada (performance do card)
 * @param {boolean} [disabled]
 * @param {string} [className]
 */
export default function BaseFilterSelect({
  bases = [],
  selectedBases = [],
  onChange,
  singleSelect = false,
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [open])

  const selectedSet = new Set(Array.isArray(selectedBases) ? selectedBases : [])
  const toggle = (base) => {
    if (singleSelect) {
      onChange(selectedSet.has(base) ? [] : [base])
      return
    }
    const next = new Set(selectedSet)
    if (next.has(base)) next.delete(base)
    else next.add(base)
    onChange([...next].sort())
  }
  const clearAll = () => {
    onChange([])
  }

  const displayLabel =
    selectedSet.size === 0
      ? 'Todas as bases'
      : selectedSet.size === 1
        ? selectedBases[0]
        : `${selectedSet.size} bases`

  return (
    <div className={`base-filter-select ${className}`} ref={boxRef}>
      <button
        type="button"
        className="base-filter-select__trigger"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || bases.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filtrar por base"
      >
        <span className="base-filter-select__label">Base</span>
        <span className="base-filter-select__value">{displayLabel}</span>
      </button>
      {open && (
        <div className="base-filter-select__dropdown" role="listbox">
          <div className="base-filter-select__list">
            {bases.map((base) => {
              const checked = selectedSet.has(base)
              return (
                <button
                  key={base}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  className={`base-filter-select__option ${checked ? 'base-filter-select__option--selected' : ''}`}
                  onClick={() => toggle(base)}
                >
                  <span className="base-filter-select__option-icon" aria-hidden>
                    {checked ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                    )}
                  </span>
                  <span className="base-filter-select__option-text">{base}</span>
                </button>
              )
            })}
          </div>
          {selectedSet.size > 0 && (
            <button
              type="button"
              className="base-filter-select__clear"
              onClick={clearAll}
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}
    </div>
  )
}
