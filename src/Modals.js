import React from 'react';
import { CheckCircle, X, Save, FileText, Trash2, User, Calendar, Hash, Eye } from 'lucide-react';
import { getFullPath } from './documentUtils';

export const FolderFilesModal = ({ isOpen, onClose, folder, files, folders }) => {
  if (!isOpen || !folder) return null;

  // Get all files in this folder tree
  const folderFiles = files.filter(f => {
    const fileFolderId = f.folderId || f.suggestedFolder?.id;
    return fileFolderId === folder.id || fileFolderId?.startsWith(folder.id + '.');
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Datoteke v mapi</h3>
            <p className="text-sm text-gray-600 mt-1">{getFullPath(folder.id, folders)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {folderFiles.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Ni datotek v tej mapi</p>
          ) : (
            <div className="space-y-2">
              {folderFiles.map((file, idx) => {
                const fileFolderId = file.folderId || file.suggestedFolder?.id;
                const fileFolder = folders.find(f => f.id === fileFolderId);
                
                return (
                  <div key={idx} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <FileText size={20} className="text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{file.fileName}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                        {file.issuer && (
                          <span className="flex items-center gap-1">
                            <User size={12} className="text-gray-400" />
                            {file.issuer}
                          </span>
                        )}
                        {file.date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-gray-400" />
                            {file.date}
                          </span>
                        )}
                        {file.documentNumber && (
                          <span className="flex items-center gap-1">
                            <Hash size={12} className="text-gray-400" />
                            {file.documentNumber}
                          </span>
                        )}
                      </div>
                      {fileFolder && fileFolderId !== folder.id && (
                        <p className="text-xs text-purple-600 mt-1">
                          → {getFullPath(fileFolderId, folders)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg font-semibold hover:bg-gray-300"
          >
            Zapri
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProcessedFilesModal = ({ isOpen, onClose, processedFiles }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">
            Že procesirane datoteke ({processedFiles.length})
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-2">
          {processedFiles.map((name, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-2"
            >
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-sm text-gray-800 truncate">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ResetConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">Ste prepričani?</h3>
          <p className="text-gray-600 mt-2">
            Trenutni proces bo ponastavljen. Vse že procesirane datoteke ostanejo shranjene za prenos.
          </p>
        </div>
        <div className="p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg font-semibold hover:bg-gray-300"
          >
            Prekliči
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
          >
            Da, nadaljuj
          </button>
        </div>
      </div>
    </div>
  );
};

export const DeleteAllModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">Ste prepričani?</h3>
          <p className="text-gray-600 mt-2">
            Trenutnen napredek bo zbrisan.
          </p>
        </div>
        <div className="p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg font-semibold hover:bg-gray-300"
          >
            Prekliči
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
          >
            Da, nadaljuj
          </button>
        </div>
      </div>
    </div>
  );
};

export const OcrTextViewModal = ({ isOpen, onClose, ocrText }) => {
  if (!isOpen || !ocrText) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">{ocrText.fileName}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded">
            {ocrText.extractedText}
          </pre>
        </div>
      </div>
    </div>
  );
};

export const FileEditModal = ({ 
  isOpen, 
  editingFileData, 
  folders, 
  setEditingFileData, 
  onCancel, 
  onSave 
}) => {
  const [pdfUrl, setPdfUrl] = React.useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);

  React.useEffect(() => {
    if (!editingFileData?.fileName) return;
    
    const fileName = editingFileData.fileName.toLowerCase();
    const isPdf = fileName.endsWith('.pdf');
    const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
                    fileName.endsWith('.png') || fileName.endsWith('.webp');
    
    if (isPdf || isImage) {
      setIsLoadingPreview(true);
      import('./indexedDBHelper').then(async (module) => {
        try {
          const file = await module.getFileFromIndexedDB(editingFileData.fileName);
          if (file) {
            const url = URL.createObjectURL(file);
            setPdfUrl(url);
          }
        } catch (error) {
          console.error('Error loading file preview:', error);
        } finally {
          setIsLoadingPreview(false);
        }
      });
    }
    
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    };
  }, [editingFileData?.fileName]);

  if (!isOpen || !editingFileData) return null;

  const fileName = editingFileData.fileName.toLowerCase();
  const isPdf = fileName.endsWith('.pdf');
  const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
                  fileName.endsWith('.png') || fileName.endsWith('.webp');
  const hasPreview = isPdf || isImage;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-start"> 
          <div>
            <h3 className="text-xl font-bold text-gray-800">Uredi dokument</h3>
            <p className="text-sm text-gray-600 mt-1">{editingFileData.fileName}</p>
          </div>
          
          <button 
            onClick={onCancel} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left side - Form */}
          <div className={`${hasPreview ? 'w-1/2' : 'w-full'} p-6 space-y-4 overflow-y-auto border-r`}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Naslov dokumenta
              </label>
              <input
                type="text"
                value={editingFileData.documentTitle || ''}
                onChange={(e) => setEditingFileData({ ...editingFileData, documentTitle: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <User size={16} className="text-gray-500" />
                Izdajatelj
              </label>
              <input
                type="text"
                value={editingFileData.issuer || ''}
                onChange={(e) => setEditingFileData({ ...editingFileData, issuer: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Hash size={16} className="text-gray-500" />
                Številka dokumenta
              </label>
              <input
                type="text"
                value={editingFileData.documentNumber || ''}
                onChange={(e) => setEditingFileData({ ...editingFileData, documentNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                Datum (DD.MM.YYYY)
              </label>
              <input
                type="text"
                value={editingFileData.date || ''}
                onChange={(e) => setEditingFileData({ ...editingFileData, date: e.target.value })}
                placeholder="01.01.2024"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mapa
              </label>
              <select
                value={editingFileData.suggestedFolder?.id || editingFileData.folderId}
                onChange={(e) => {
                  const folderId = e.target.value;
                  const folder = folders.find(f => f.id === folderId);
                  setEditingFileData({
                    ...editingFileData,
                    folderId: folderId,
                    suggestedFolder: folder ? {
                      id: folder.id,
                      name: folder.name,
                      fullPath: getFullPath(folder.id, folders)
                    } : editingFileData.suggestedFolder
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {getFullPath(folder.id, folders)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Right side - PDF/Image Preview */}
          {hasPreview && (
            <div className="w-1/2 flex flex-col bg-gray-50">
              <div className="p-4 border-b bg-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Eye size={16} />
                  Predogled (nima še dodane šifre - doda se pri zip prenosu)
                </span>
                {pdfUrl && (
                  <button
                    onClick={() => window.open(pdfUrl, '_blank')}
                    className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200 transition-colors"
                  >
                    Odpri v novem oknu
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-hidden flex items-center justify-center">
                {isLoadingPreview ? (
                  <div className="text-gray-500 text-sm">Nalaganje predogleda...</div>
                ) : pdfUrl ? (
                  isPdf ? (
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full"
                      title="PDF Preview"
                    />
                  ) : (
                    <img
                      src={pdfUrl}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  )
                ) : (
                  <div className="text-gray-500 text-sm">Predogled ni na voljo</div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded-lg font-semibold hover:bg-gray-300"
          >
            Prekliči
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 flex items-center gap-2"
          >
            <Save size={16} />
            Shrani
          </button>
        </div>
      </div>
    </div>
  );
};