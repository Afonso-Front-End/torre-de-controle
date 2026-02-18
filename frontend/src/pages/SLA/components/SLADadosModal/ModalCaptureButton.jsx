import { useRef, useCallback, useState } from 'react'
import html2canvas from 'html2canvas'
import './ModalCaptureButton.css'

export default function ModalCaptureButton({
  targetRef,
  downloadFilename = 'captura',
  className = '',
}) {
  const buttonRef = useRef(null)
  const [isCapturing, setIsCapturing] = useState(false)

  const handleCapture = useCallback(async () => {
    const el = targetRef?.current
    const btn = buttonRef.current
    if (!el || isCapturing) return

    try {
      setIsCapturing(true)
      await new Promise((resolve) => setTimeout(resolve, 100))

      // --- CORREÇÃO AQUI ---
      // Largura: Usamos offsetWidth (largura exata do elemento na tela, sem sobras)
      const w = el.offsetWidth
      // Altura: Usamos scrollHeight (altura total do conteúdo escondido)
      const h = el.scrollHeight

      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: false,
        scale: window.devicePixelRatio || 2,
        
        // Travamos as dimensões exatas para não sobrar espaço
        width: w, 
        height: h,
        windowWidth: w, // A janela virtual deve ter a MESMA largura do elemento
        windowHeight: h,

        x: 0, // Garante que começa do canto 0 do elemento
        y: 0, // Garante que começa do topo 0 do elemento
        
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff',
        ignoreElements: (node) => node === btn,
        logging: false,

        onclone: (clonedDoc) => {
          const clonedModal = clonedDoc.querySelector('.sla-dados-modal')
          const clonedBody = clonedDoc.querySelector('.sla-dados-modal__body')
          const clonedScrollWrap = clonedDoc.querySelector('.sla-dados-modal__motoristas-wrap--scroll')
          
          if (clonedScrollWrap) {
            clonedScrollWrap.style.height = 'auto'
            clonedScrollWrap.style.maxHeight = 'none'
            clonedScrollWrap.style.overflow = 'visible'
            clonedScrollWrap.style.display = 'block'
          }

          if (clonedBody) {
            clonedBody.style.height = 'auto'
            clonedBody.style.maxHeight = 'none'
            clonedBody.style.overflow = 'visible'
            clonedBody.style.flex = 'none'
          }

          if (clonedModal) {
            // Força a altura exata calculada e trava a largura
            clonedModal.style.height = `${h}px`
            clonedModal.style.width = `${w}px` // Trava a largura no clone também
            clonedModal.style.maxWidth = 'none' // Remove limites que possam centralizar
            clonedModal.style.minHeight = `${h}px`
            clonedModal.style.maxHeight = 'none'
            clonedModal.style.overflow = 'visible'
            clonedModal.style.margin = '0' // Remove margens de centralização se houver
            clonedModal.style.paddingBottom = '0'
          }
        },
      })

      const dataUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.download = `${downloadFilename}.png`
      a.href = dataUrl
      a.click()

    } catch (err) {
      console.error('Erro ao capturar tela:', err)
      alert('Erro ao gerar imagem.')
    } finally {
      setIsCapturing(false)
    }
  }, [targetRef, downloadFilename, isCapturing])

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`modal-capture-btn ${className}`.trim()}
      onClick={handleCapture}
      disabled={isCapturing}
      style={{ opacity: isCapturing ? 0.7 : 1, cursor: isCapturing ? 'wait' : 'pointer' }}
    >
      {isCapturing ? (
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="animate-spin">
           <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      )}
    </button>
  )
}