import { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  File,
  Image as ImageIcon,
  Plus,
  Send,
  AlertTriangle,
} from 'lucide-react';
import './FileShareModal.css';

function formatFileSize(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  if (bytes < k) return `${bytes} B`;
  if (bytes < k * k) return `${(bytes / k).toFixed(dm)} KB`;
  return `${(bytes / (k * k)).toFixed(dm)} MB`;
}

function getFileIcon(type = '', name = '') {
  const n = name.toLowerCase();
  const t = type.toLowerCase();
  if (t.startsWith('image/')) return <ImageIcon size={18} className="file-icon--image" />;
  if (t.includes('pdf') || n.endsWith('.pdf')) return <FileText size={18} className="file-icon--pdf" />;
  if (t.includes('presentation') || t.includes('powerpoint') || n.match(/\.(pptx|ppt)$/i))
    return <FileText size={18} className="file-icon--presentation" />;
  if (t.includes('spreadsheet') || t.includes('excel') || n.match(/\.(xlsx|xls|csv)$/i))
    return <FileSpreadsheet size={18} className="file-icon--spreadsheet" />;
  if (n.match(/\.(zip|tar|gz|rar|7z)$/i)) return <FileArchive size={18} className="file-icon--archive" />;
  if (n.match(/\.(js|jsx|ts|tsx|py|cpp|c|java|html|css|json|md)$/i))
    return <FileCode size={18} className="file-icon--code" />;
  return <File size={18} className="file-icon--generic" />;
}

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSendFiles: (files: File[]) => void,
 *   initialFiles?: object[],
 * }} props
 */
export function FileShareModal({ isOpen, onClose, onSendFiles, initialFiles = [] }) {
  const [stagedFiles, setStagedFiles] = useState(initialFiles);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFilesAdded = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setStagedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemove = (id) => {
    setStagedFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleSend = () => {
    if (stagedFiles.length === 0) return;
    onSendFiles(stagedFiles.map((f) => f.file));
    onClose();
  };

  const hasLargeFile = stagedFiles.some((f) => f.size > 100 * 1024 * 1024);

  return (
    <div className="file-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Share Files">
      <div className="file-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="file-modal__header">
          <div className="file-modal__header-left">
            <div className="file-modal__header-icon">
              <UploadCloud size={18} className="text-accent" />
            </div>
            <h3 className="file-modal__title text-heading-sm font-semibold">Share Files</h3>
          </div>
          <button type="button" className="file-modal__close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="file-modal__body">
          {/* Dropzone */}
          <div
            className={`file-dropzone ${isDragOver ? 'file-dropzone--active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFilesAdded(e.target.files)}
            />
            <div className="file-dropzone__icon-circle">
              <UploadCloud size={24} className="text-accent" />
            </div>
            <div className="file-dropzone__content">
              <span className="file-dropzone__main-text">
                <strong>Click to add files</strong> or drag and drop
              </span>
              <span className="file-dropzone__types-text">
                PDF · DOCX · Images · ZIP · Code
              </span>
            </div>
          </div>

          {/* Selected Files Section */}
          {stagedFiles.length > 0 && (
            <div className="file-modal__selected-section">
              <div className="file-modal__selected-header">
                <span className="file-modal__selected-label">Selected Files</span>
                <button
                  type="button"
                  className="file-modal__add-more-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus size={13} />
                  <span>Add more</span>
                </button>
              </div>

              <div className="file-modal__file-list">
                {stagedFiles.map((item) => (
                  <div key={item.id} className="file-selected-row">
                    <div className="file-selected-row__icon-wrap">
                      {item.previewUrl ? (
                        <img src={item.previewUrl} alt={item.name} className="file-selected-row__thumb" />
                      ) : (
                        <div className="file-selected-row__icon-box">
                          {getFileIcon(item.type, item.name)}
                        </div>
                      )}
                    </div>

                    <div className="file-selected-row__info">
                      <span className="file-selected-row__name" title={item.name}>
                        {item.name}
                      </span>
                      <span className="file-selected-row__size">
                        {formatFileSize(item.size)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="file-selected-row__remove-btn"
                      onClick={() => handleRemove(item.id)}
                      aria-label={`Remove ${item.name}`}
                      title="Remove file"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {hasLargeFile && (
                <div className="file-modal__large-alert">
                  <AlertTriangle size={13} className="text-warning" />
                  <span>Large files may take longer to transfer via P2P.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="file-modal__footer">
          <button type="button" className="file-modal__btn file-modal__btn--cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="file-modal__btn file-modal__btn--send"
            onClick={handleSend}
            disabled={stagedFiles.length === 0}
          >
            <Send size={14} />
            <span>{stagedFiles.length > 1 ? `Send ${stagedFiles.length} Files` : 'Send File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
