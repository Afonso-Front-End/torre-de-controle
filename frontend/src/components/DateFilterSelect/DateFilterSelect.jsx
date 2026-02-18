import { useState, useEffect, useRef } from 'react'
import './DateFilterSelect.css'

/**
 * Formata "YYYY-MM-DD" para exibição "DD/MM/YYYY".
 */
export function formatDateForDisplay(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return isoDate
  const [y, m, d] = isoDate.split('-')
  if (!d) return isoDate
  return `${d}/${m}/${y}`
}

/**
 * Select de data única de importação.
 * @param {string} token - JWT
 * @param {() => Promise<{ datas: string[] }>} fetchDatas - Função que retorna { datas }
 * @param {string[]} selectedDatas - Data selecionada (YYYY-MM-DD) - array com uma única data ou vazio
 * @param {(datas: string[]) => void} onChange - Callback ao alterar seleção (recebe array com uma data ou vazio)
 * @param {string} [label] - Rótulo (ex: "Data do envio")
 * @param {boolean} [disabled]
 * @param {string} [className]
 */
export default function DateFilterSelect({
  token,
  fetchDatas,
  selectedDatas = [],
  onChange,
  label = '',
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [datas, setDatas] = useState([])
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    if (!token || !fetchDatas) {
      setDatas([])
      return
    }
    setLoading(true)
    fetchDatas()
      .then((res) => {
        const list = Array.isArray(res?.datas) ? res.datas : []
        setDatas(list)
      })
      .catch(() => setDatas([]))
      .finally(() => setLoading(false))
  }, [token, fetchDatas])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      // Verificar se o clique foi dentro do componente
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    // Usar capture: false para garantir que eventos dentro do dropdown sejam processados primeiro
    document.addEventListener('pointerdown', handleClickOutside, false)
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, false)
    }
  }, [open])

  // Para seleção única, pegar a primeira data do array ou null
  const selectedDate = Array.isArray(selectedDatas) && selectedDatas.length > 0 ? selectedDatas[0] : null
  
  const toggle = (d) => {
    // Sempre selecionar a data clicada (seleção única)
    // Se clicar na mesma data, mantém selecionada
    onChange([d])
    // Fechar o dropdown após seleção
    setOpen(false)
  }

  const displayLabel = selectedDate
    ? formatDateForDisplay(selectedDate)
    : 'Selecionar data'

  return (
    <div
      className={`date-filter-select ${className}`.trim()}
      ref={boxRef}
    >
      {label && (
        <span className="date-filter-select__label" id="date-filter-label">
          {label}
        </span>
      )}
      <button
        type="button"
        className="date-filter-select__trigger"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="date-filter-label"
      >
        <span className="date-filter-select__trigger-text">
          {loading ? 'A carregar…' : displayLabel}
        </span>
        <span className="date-filter-select__trigger-icon" aria-hidden>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <div
          className="date-filter-select__dropdown"
          role="listbox"
          aria-multiselectable="false"
          aria-label={label}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ul className="date-filter-select__list">
            {datas.length === 0 && !loading && (
              <li className="date-filter-select__empty">Nenhuma data de importação</li>
            )}
            {datas.map((d) => {
              const checked = selectedDate === d
              return (
                <li key={d}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={checked}
                    className={`date-filter-select__option ${checked ? 'date-filter-select__option--selected' : ''}`}
                    onClick={() => toggle(d)}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <span className="date-filter-select__option-check" aria-hidden>
                      {checked ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                        </svg>
                      )}
                    </span>
                    <span className="date-filter-select__option-label">{formatDateForDisplay(d)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
