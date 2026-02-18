import { MdUpload } from 'react-icons/md'
import { useSLAImport } from './useSLAImport'
import { ACCEPTED_FILE_TYPES } from '../../SLA.js'
import './SLAImportDrop.css'

export default function SLAImportDrop({ token, onImportSuccess, onLoadingChange }) {
  const { loading, inputRef, handleArquivo } = useSLAImport(token, onImportSuccess, onLoadingChange)

  return (
    <label
      className={`sla-import-drop ${loading ? 'sla-import-drop--uploading' : ''}`}
      title="Clique ou arraste um arquivo .xlsx"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="sla-import-drop__input"
        onChange={handleArquivo}
        disabled={loading}
      />
      <MdUpload className="sla-import-drop__icon" aria-hidden />
      <span className="sla-import-drop__text">Selecionar arquivo .xlsx</span>
    </label>
  )
}
